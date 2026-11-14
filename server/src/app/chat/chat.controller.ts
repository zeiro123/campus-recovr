import { NextFunction, Request, Response } from "express";
import { chatService } from "./chat.service";
import sendResponse from "../global/response";
import { StatusCodes } from "http-status-codes";

const createChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;
    const result = await chatService.getOrCreateChat(req.user, userId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Conversation ready",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};

const getMyChats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await chatService.getMyChats(req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Conversations retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};

const getChatMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const after = typeof req.query.after === "string" ? req.query.after : undefined;
    const result = await chatService.getChatMessages(req.user, id, after);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Messages retrieved successfully",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};

const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { body } = req.body;
    const result = await chatService.sendMessage(req.user, id, body);
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Message sent",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};

const markChatRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await chatService.markChatRead(req.user, id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Conversation marked as read",
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};

export const chatController = {
  createChat,
  getMyChats,
  getChatMessages,
  sendMessage,
  markChatRead,
};
