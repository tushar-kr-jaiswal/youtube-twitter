import path from "path";
import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    deleteFromCloudinary,
    uploadOnCloudinary,
} from "../utils/cloudinary.js";

const imageFormats = ["jpg", "jpeg", "png", "bmp", "tiff", "webp"];
const videoFormats = [
    "mp4",
    "avi",
    "mov",
    "wmv",
    "mkv",
    "flv",
    "webm",
    "mpg",
    "mpeg",
    "3gp",
    "ts",
];

const validateFormat = (array, pathOfFile, format) => {
    const allowedExtensions = [...array];
    const filePath = pathOfFile;
    const fileExtension = path.extname(filePath).slice(1).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
        throw new ApiError(
            400,
            `Invalid file format: ${fileExtension}. Only ${format} formats are allowed.`
        );
    }
    return;
};

const getAllVideos = asyncHandler(async (req, res) => {
    // validate the userId
    // integrate the pipelines to get the video's owner's username and "avatar.url"
    // use the options like limit and page
    //  then use the aggregatePaginate method
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "relevance",
        sortType = "desc",
        userId,
    } = req.query;
    //TODO: get all videos based on query, sort, pagination

    // console.log(userId);

    const pipeline = []; // dynamically push methods in it

    if (!query) {
        throw new ApiError(404, "Query not found!");
    }

    if (query) {
        pipeline.push({
            $search: {
                index: "default",
                text: {
                    query: query,
                    path: ["title", "description"],
                },
            },
        });
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
        $match: {
            owner: new mongoose.Types.ObjectId(userId),
        },
    });

    pipeline.push({
        $match: {
            isPublished: true,
        },
    });

    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1,
            },
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$ownerDetails",
        }
    );

    const videoAggregate = await Video.aggregate(pipeline);

    // console.log("videoAggregate --- ", videoAggregate);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    // console.log("video --- ", video);

    if (!video || video?.docs.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "No vidoes are available"));
    }

    if (video?.length <= 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "No more videos are available"));
    }
    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    if ([title, description].some((field) => field.trim() === "")) {
        throw new ApiError(400, "Title and Description both are required");
    }

    const videoLocalFilePath = req.files?.videoFile[0]?.path;

    validateFormat(videoFormats, videoLocalFilePath, "video"); // To validate the format of video

    const thumbnailLocalFilePath = req.files?.thumbnail[0]?.path;

    validateFormat(imageFormats, thumbnailLocalFilePath, "image"); // To validate the format of thumbnail

    if (!videoLocalFilePath) {
        throw new ApiError(400, "Video file not found");
    }

    if (!thumbnailLocalFilePath) {
        throw new ApiError(400, "Thumbnail file not found");
    }

    const videoFile = await uploadOnCloudinary(videoLocalFilePath, "video");
    // console.log(videoFile);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath, "image");

    if (!videoFile?.url) {
        throw new ApiError(400, "Video file not uploaded on cloudinary");
    }

    if (!thumbnail?.url) {
        throw new ApiError(400, "Thumbnail file not uploaded on cloudinary");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile?.duration,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id,
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id,
        },
        owner: req.user?._id,
        isPublished: false,
    });

    const uploadedVideo = await Video.findById(video._id);

    if (!uploadedVideo) {
        throw new ApiError(500, "videoUpload failed please try again !!!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video Uploaded Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id

    //  find a video using aggregate
    //  then lookup in user and form that lookup in subscription to get the subscribers of the owner
    //  count susbcriber and add field like isSubscribed
    //  project the fields like subscriber and isSubscribed and username and avatar.url
    //  now lookup in likes model to count the likes and isLiked and get only firstAt from owner
    //  project the fields - 'videoFile.url', duration, likes, isLiked, comments, views, owner, title, description
    //  if video is present then increase the view by 1
    //  and push that videoId in watchHistory
    //  return res

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid userId");
    }

    const video = await Video.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(videoId) },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            isSubscribed: 1,
                            subscribersCount: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                duration: 1,
                likesCount: 1,
                isLiked: 1,
                comments: 1,
                views: 1,
                owner: 1,
            },
        },
    ]);

    if (!video) {
        throw new ApiError(500, "Failed to fetch Video"); // If video is not found due to some technical error
    }

    if (!video[0]) {
        throw new ApiError(404, "Video not found"); // If video does not exist or deleted
    }

    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        },
    });

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "Video details fetched Successfully")
        );
});

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail

    // get title,description from body
    // validate them
    // find a video by id to check whethr the video exist
    // only allow if the owner of video is same as req.user._id
    // hold the oldThumbnail to delete after successful updation
    // check for thumbnail
    // update the video with respective fields
    // if updation is successful then delete the oldThumbnail
    // return res

    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const { title, description } = req.body;

    if ([title, description].some((field) => field.trim() === "")) {
        throw new ApiError(400, "Title and description are required");
    }

    const video = await Video.findById(videoId);

    const thumbnailToDelete = video.thumbnail?.public_id; //old thumbnail to be deleted

    if (video?.owner.toString() !== (req.user?._id).toString()) {
        throw new ApiError(
            400,
            "You can't edit this video as you are not the owner"
        );
    }

    const thumbnailLocalFilePath = req.file?.path; // new thumbnail to set

    validateFormat(imageFormats, thumbnailLocalFilePath, "image"); // To validate the thumbnail

    if (!thumbnailLocalFilePath) {
        throw new ApiError(400, "Thumbnail not found");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalFilePath);

    if (!thumbnail) {
        throw new ApiError(400, "Unable to update thumbnail");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    url: thumbnail?.url,
                    public_id: thumbnail?.public_id,
                },
            },
        },
        { new: true }
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video please try again");
    }

    if (updatedVideo) {
        await deleteFromCloudinary(thumbnailToDelete);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated Successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    // TODO: delete video
    // find video
    // check if user is the owner of video
    // if yes then delete the video from cloudinary
    // delete likes
    // delete comments
    //  return res

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if ((video?.owner).toString() !== (req.user?._id).toString()) {
        throw new ApiError(
            400,
            "You cannot delete the video as you are not the owner."
        );
    }
    const videoDeleted = await Video.findByIdAndDelete(video?._id);
    if (!videoDeleted) {
        throw new ApiError(400, "Failed to delete the video please try again");
    }

    await deleteFromCloudinary(video?.videoFile?.public_id, "video"); // deleting the videoFile
    await deleteFromCloudinary(video?.thumbnail?.public_id, "image"); // deleting the thumbNailFile

    await Like.deleteMany({
        video: videoId,
    });

    await Comment.deleteMany({
        video: videoId,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    //  validate the videoId
    //  validate if the user and owner is same or not
    //  if owner is same as user then use the set method and { new : true } to save the toggleStatus
    //  return res
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (video.owner.toString() !== (req.user?._id).toString()) {
        throw new ApiError(
            400,
            "You cannot change the status of video as you are not the owner."
        );
    }

    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished,
            },
        },
        { new: true }
    );

    if (!toggledVideoPublish) {
        throw new ApiError(500, "Failed to toogle video publish status");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                isPublished: toggledVideoPublish.isPublished,
            },
            "Video publish toggled successfully"
        )
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
