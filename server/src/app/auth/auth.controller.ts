import { Request, Response } from "express";
import sendResponse from "../global/response";
import { StatusCodes } from "http-status-codes";
import { authServices } from "./auth.service";
import { TLogin } from "../global/interface";

const login = async (req: Request, res: Response) => {
  try {

    const user: TLogin = req.body;
    const result = await authServices.loginUser(user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'User logged in successfully',
        data: result,
      });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};
const oauthLogin = async (req: Request, res: Response) => {
  try {
    const { accessToken, provider } = req.body;
    const result = await authServices.oauthLogin(accessToken, provider);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Social sign-in successful",
      data: result,
    });
  } catch (error: any) {
    // Known app errors carry a statusCode — surface their message. Anything
    // else (raw Prisma dumps etc.) stays generic, never a stack trace.
    const known = Boolean(error?.statusCode);
    sendResponse(res, {
      statusCode: error?.statusCode || StatusCodes.BAD_REQUEST,
      success: false,
      message: known
        ? error?.message || "Social sign-in failed"
        : "Social sign-in failed — please try again, or use email and password.",
      data: null,
    });
  }
};
const newPasswords = async (req: Request, res: Response) => {
  try {
    const passwordData = req.body;
    const result = await authServices.newPasswords(passwordData, req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Password changed successfully',
        data: result,
      });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

const changeEmail = async (req: Request, res: Response) => {
  try {
    const email:string = req.body;
    // console.log(email)
    const result = await authServices.changeEmail(email, req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Email changed successfully',
        data: result,
      });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

const changeUsername = async (req: Request, res: Response) => {
  try {
    const username = req.body;
    const result = await authServices.changeUsername(username, req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Username changed successfully',
        data: result,
      });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};


// ── Password reset + email verification ──────────────────────────────
const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) throw new Error("An email address is required");
    const result = await authServices.forgotPassword(email);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: { delivered: result.delivered, resetLink: result.resetLink },
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new Error("A token and the new password are required");
    }
    const result = await authServices.resetPassword(token, newPassword);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: error?.message?.includes("expired") || error?.message?.includes("invalid")
        ? StatusCodes.UNAUTHORIZED
        : StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

const sendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const result = await authServices.sendVerificationEmail(req.user.id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: { verifyLink: result.verifyLink, alreadyVerified: result.alreadyVerified },
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) throw new Error("A verification token is required");
    const result = await authServices.verifyEmail(token);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: null,
    });
  } catch (error: any) {
    sendResponse(res, {
      statusCode: error?.message?.includes("expired") || error?.message?.includes("invalid")
        ? StatusCodes.UNAUTHORIZED
        : StatusCodes.BAD_REQUEST,
      success: false,
      message: error?.message,
      data: null,
    });
  }
};

export const authController={
    login,
    oauthLogin,
    newPasswords,
    changeEmail,
    changeUsername,
    forgotPassword,
    resetPassword,
    sendVerificationEmail,
    verifyEmail
}
