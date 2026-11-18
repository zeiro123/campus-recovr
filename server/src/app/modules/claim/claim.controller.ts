import { NextFunction, Request, Response } from "express";
import sendResponse from "../../global/response";
import { StatusCodes } from "http-status-codes";
import { Claim } from "@prisma/client";
import { claimsService } from "./claim.service";

const createClaim = async (req: Request, res: Response) => {
  try {
    const item: Claim = req.body;
    const result = await claimsService.createClaim(item, req.user);

    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Claim created successfully",
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

const getClaim = async (req: Request, res: Response) => {
  try {
    const result = await claimsService.getClaim();

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Claims retrieved successfully",
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

const getMyClaim = async (req: Request, res: Response) => {
  try {
    const user = req.user
    const result = await claimsService.getMyClaim(user);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Claims retrieved successfully",
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

const updateClaimStatus = async (req: Request, res: Response,next:NextFunction) => {
  try {
    const result = await claimsService.updateClaimStatus(req.params.claimId,req.body, req.user);
    // console.log(req.params.claimId);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Claims updated successfully",
      data: result,
    });
  } catch (error: any) {
   next(error)
  }
};

// Publisher opens a claim → mark viewed
const viewClaim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await claimsService.viewClaim(req.params.claimId, req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Claim marked as viewed",
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

// Publisher asks for more information
const requestInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    const result = await claimsService.requestInfo(req.params.claimId, message || "", req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Information request sent to the claimant",
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

// Claimant adds more information to their claim
const updateClaimInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { distinguishingFeatures } = req.body;
    const result = await claimsService.updateClaimInfo(
      req.params.claimId,
      distinguishingFeatures || "",
      req.user
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Claim updated with more information",
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

// Claimant appeals a rejected claim
const appealClaim = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;
    const result = await claimsService.appealClaim(req.params.claimId, message || "", req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Appeal sent — the publisher will re-review your claim",
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

// Claims on the items I published (publisher inbox)
const getClaimsForMyItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await claimsService.getClaimsForMyItems(req.user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Claims on your items retrieved successfully",
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

export const claimsController = {
  createClaim,
  getClaim,
  updateClaimStatus,
  getMyClaim,
  getClaimsForMyItems,
  viewClaim,
  requestInfo,
  updateClaimInfo,
  appealClaim
};
