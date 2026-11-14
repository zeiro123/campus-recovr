import { utils } from "../utils/utils";
import AppError from "../global/error";
import { StatusCodes } from "http-status-codes";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../config/prisma";
import crypto from "crypto";

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

  const { id, name, email, role, userImg, username, phone } = user;
  const accessToken = utils.createToken({ id, name, email, username, role, userImg, phone });

  return {
    id: user.id,
    name: name || "User",
    username: user.username,
    email: user.email,
    role,
    phone: user.phone,
    token: accessToken,
  };
};

const newPasswords = async (data: any, user: JwtPayload) => {
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
const oauthLogin = async (accessToken: string) => {
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

  let user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    // New social user — derive a unique username from the email.
    const base =
      profile.user_metadata?.user_name ||
      email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") ||
      "user";
    let username = base.slice(0, 20);
    let suffix = 0;
    while (await prisma.user.findFirst({ where: { username } })) {
      suffix += 1;
      username = `${base.slice(0, 16)}${suffix}`.slice(0, 20);
    }
    // Random local password — social users never use it.
    const randomPassword = crypto.randomBytes(24).toString("hex");
    user = await prisma.user.create({
      data: {
        username,
        email,
        password: await utils.passwordHash(randomPassword),
        userImg: avatarUrl,
        name: fullName,
      },
    });
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
  });

  return {
    id: user.id,
    name: name || fullName || "User",
    username: user.username,
    email: user.email,
    role,
    token: appToken,
  };
};

export const authServices = {
  loginUser,
  newPasswords,
  changeEmail,
  changeUsername,
  oauthLogin,
};
