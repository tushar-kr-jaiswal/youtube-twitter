import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (loaclFilePath) => {
    try {
        if (!loaclFilePath) {
            console.log("File not Found !!!");
        }
        const response = await cloudinary.uploader.upload(loaclFilePath, {
            resource_type: "auto",
        });

        console.log(`📁  File has been uploaded ~ ${response.url}`);

        fs.unlinkSync(loaclFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(loaclFilePath);
        return null;
    }
};

const deleteFromCloudinary = async (localFilePath, resource_type = "image") => {
    try {
        if (!localFilePath) return null;

        const parts = localFilePath.split("/");
        const fileWithExtension = parts.pop(); // Extract "sample.jpg"
        const publicId = fileWithExtension.split(".").slice(0, -1).join("."); // Remove extension
        const folder = parts.slice(parts.indexOf("upload") + 1).join("/"); // Get folder path
        const finalURL = folder ? publicId : `${folder}/${publicId}`;

        const response = await cloudinary.uploader.destroy(finalURL, {
            resource_type: `${resource_type}`,
        });
        console.log("Old Image deleted Successfully");
        return response;
    } catch (error) {
        return error;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
