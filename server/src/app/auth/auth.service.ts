import { utils } from "../utils/utils";
import AppError from "../global/error";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import config from "../config/config";
import crypto from "crypto";
import { sendEmail, emailHtml } from "../utils/email";

const loginUser = async (data: any) => {
  const { password, username: userNameEmail } = data;
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          username: userNameEmail,
        },
        {
          email: userNameEmail,
        },
      ],
    },
  });

  if (!user) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "User does not exist");
  }

  if (password && !(await utils.comparePasswords(password, user.password))) {
    throw new AppError(StatusCodes.FORBIDDEN, "Password is incorrect");
  }

  const { id, name, email, role, userImg, username, phone, provider } = user;
  const accessToken = utils.createToken({ id, name, email, username, role, userImg, phone, provider });

  return {
    id: user.id,
    name: name || "User",
    username: user.username,
    email: user.email,
    role,
    phone: user.phone,
    provider: user.provider,
    token: accessToken,
  };
};

const newPasswords = async (data: any, user: JwtPayload) => {
  // Social users (Google/Facebook) have no usable local password.
  if (user.provider && user.provider !== "local") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `You signed in with ${user.provider === "google" ? "Google" : user.provider}. Password change isn't available for social accounts.`
    );
  }
  console.log(data.newPassword);
  if (data.currentPassword === data.newPassword) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password is same");
  }
  const existedUser = await prisma.user.findFirst({
    where: {
      username: user.username,
    },
  });
  // console.log(user)
  if (
    data.currentPassword &&
    existedUser &&
    !(await utils.comparePasswords(data.currentPassword, existedUser.password))
  ) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Password is incorrect");
  }

  const newHashPassword = await utils.passwordHash(data.newPassword);
  await prisma.user.update({
    where: {
      email: existedUser?.email,
    },
    data: {
      password: newHashPassword,
    },
  });
};

const changeEmail = async (email: any, user: JwtPayload) => {
  // console.log(email);
  const existedUser: any = await prisma.user.findFirst({
    where: email,
  });
  // console.log(user);

  // console.log(existedUser);
  if (existedUser) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "Email already exists. Try new one!"
    );
  }
  await prisma.user.update({
    where: {
      username: user?.username,
    },
    data: email,
  });
};

const changeUsername = async (username: object, user: JwtPayload) => {
  const existedUser = await prisma.user.findFirst({
    where: username,
  });
  if (existedUser) {
    throw new AppError(
      StatusCodes.CONFLICT,
      "Username already exists. Try new one!"
    );
  }

  // console.log(user);
  await prisma.user.update({
    where: {
      email: user.email,
    },
    data: username,
  });
};

// OAuth sign-in (Google / Facebook via Supabase Auth): verify the Supabase
// access token server-side, upsert the matching app user, issue the app JWT.
const oauthLogin = async (accessToken: string, provider = "google") => {
  if (!accessToken) {
    throw new AppError(StatusCodes.BAD_REQUEST, "accessToken is required");
  }
  const supabaseUrl = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Social sign-in is not configured on the server"
    );
  }

  // Re-verify the Supabase session server-side — never trust the client.
  const verifyRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!verifyRes.ok) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Invalid or expired social sign-in session"
    );
  }
  const profile = (await verifyRes.json()) as {
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
      user_name?: string;
    };
  };
  const email = profile.email;
  if (!email) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "The social account has no email address"
    );
  }

  const fullName =
    profile.user_metadata?.full_name || profile.user_metadata?.name || "";
  const avatarUrl = profile.user_metadata?.avatar_url || "";

  // Case-insensitive lookup — emails can arrive with different casing.
  let user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) {
    // New social user — derive a unique username from the email.
    const base =
      profile.user_metadata?.user_name ||
      email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") ||
      "user";
    const randomSuffix = () => crypto.randomBytes(3).toString("hex");
    let username = base.slice(0, 20);
    // Create with collision retries: a username clash appends a random
    // suffix instead of surfacing a raw Prisma error.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const randomLocalPassword = crypto.randomBytes(24).toString("hex");
        user = await prisma.user.create({
          data: {
            username,
            email,
            password: await utils.passwordHash(randomLocalPassword),
            userImg: avatarUrl,
            name: fullName,
            provider,
          },
        });
        break;
      } catch (err: any) {
        // P2002 = unique constraint; retry with a randomised handle.
        if (String(err?.code) === "P2002" && attempt < 3) {
          username = `${base.slice(0, 12)}-${randomSuffix()}`.slice(0, 20);
          continue;
        }
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          "We couldn't create your account — please try again."
        );
      }
    }
    if (!user) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "We couldn't create your account — please try again."
      );
    }
  }

  const { id, name, role, userImg, username } = user;
  const appToken = utils.createToken({
    id,
    name,
    email,
    username,
    role,
    userImg,
    phone: user.phone,
    provider: user.provider,
  });

  return {
    id: user.id,
    name: name || fullName || "User",
    username: user.username,
    email: user.email,
    role,
    provider: user.provider,
    token: appToken,
  };
};

// ── Password reset (email token, 30 min) ────────────────────────────────
const RESET_TOKEN_TTL = "30m";

const createPurposeToken = (id: string, purpose: string) =>
  jwt.sign({ id, purpose }, (config.jwt_secrets as string) + purpose, {
    expiresIn: RESET_TOKEN_TTL,
  });

const verifyPurposeToken = (token: string, purpose: string) => {
  const payload = jwt.verify(token, (config.jwt_secrets as string) + purpose) as {
    id?: string;
  };
  if (!payload?.id) throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid token");
  return payload.id as string;
};

const forgotPassword = async (email: string) => {
  const user = await prisma.user.findFirst({
    where: { email, isDeleted: false },
  });
  // Never reveal whether the email exists — same response either way.
  if (!user) {
    return {
      message: "If that email exists, a reset link has been sent.",
      delivered: false,
      resetLink: undefined as string | undefined,
    };
  }
  if (user.provider && user.provider !== "local") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "This account uses social sign-in — reset the password from Google instead."
    );
  }

  const token = createPurposeToken(user.id, "reset");
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  const result = await sendEmail(
    user.email,
    "Reset your Campus RecovR password",
    emailHtml(
      "Password reset",
      "You asked to reset your password. This link expires in 30 minutes. If you didn't request it, you can safely ignore this email.",
      "Reset password",
      resetLink
    )
  );

  const isDev = process.env.NODE_ENV !== "production";
  return {
    message: result.delivered
      ? "Reset link sent — check your email."
      : "Email service isn't configured — use the link below (QA mode).",
    delivered: result.delivered,
    // Only ever exposed outside production so QA can complete the flow.
    resetLink: isDev && !result.delivered ? resetLink : undefined,
  };
};

const resetPassword = async (token: string, newPassword: string) => {
  if (!newPassword || newPassword.length < 8) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Password must be at least 8 characters"
    );
  }
  let userId: string;
  try {
    userId = verifyPurposeToken(token, "reset");
  } catch {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Reset link is invalid or has expired — request a new one."
    );
  }
  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) throw new AppError(StatusCodes.UNAUTHORIZED, "User not found");
  if (user.provider && user.provider !== "local") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "This account uses social sign-in — reset the password from Google instead."
    );
  }
  await prisma.user.update({
    where: { id: userId },
    data: { password: await utils.passwordHash(newPassword) },
  });
  return { message: "Password reset — you can sign in now." };
};

// ── Email verification ──────────────────────────────────────────────────
const sendVerificationEmail = async (userId: string) => {
  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) throw new AppError(StatusCodes.UNAUTHORIZED, "User not found");
  if (user.emailVerified) {
    return { message: "Email is already verified.", alreadyVerified: true };
  }
  const token = createPurposeToken(user.id, "verify");
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const verifyLink = `${clientUrl}/verify-email?token=${token}`;

  const result = await sendEmail(
    user.email,
    "Verify your Campus RecovR email",
    emailHtml(
      "Verify your email",
      "Confirm your email address to finish setting up your Campus RecovR account.",
      "Verify email",
      verifyLink
    )
  );

  const isDev = process.env.NODE_ENV !== "production";
  return {
    message: result.delivered
      ? "Verification email sent — check your inbox."
      : "Email service isn't configured — use the link below (QA mode).",
    delivered: result.delivered,
    verifyLink: isDev && !result.delivered ? verifyLink : undefined,
  };
};

const verifyEmail = async (token: string) => {
  let userId: string;
  try {
    userId = verifyPurposeToken(token, "verify");
  } catch {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Verification link is invalid or has expired — request a new one."
    );
  }
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
  return { message: "Email verified — thanks!" };
};

export const authServices = {
  loginUser,
  newPasswords,
  changeEmail,
  changeUsername,
  oauthLogin,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};
