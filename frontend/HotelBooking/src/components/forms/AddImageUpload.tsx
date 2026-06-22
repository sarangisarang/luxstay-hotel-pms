"use client";

import { useState } from "react";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

export default function ImageUploadPage() {
  const { t } = useTranslation();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setUploadedUrl(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            setUploading(true);
            const response = await api.post("/api/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setUploadedUrl(response.data.url || "Uploaded successfully!");
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
            <h1 className="text-2xl font-bold mb-4 text-center">Image Upload</h1>

            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="mb-4"
            />

            {previewUrl && (
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Preview:</p>
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-auto rounded shadow"
                    />
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="bg-blue-500 text-white p-2 rounded w-full hover:bg-blue-600 disabled:bg-gray-400"
            >
                {uploading ? "Uploading..." : "Upload Image"}
            </button>

            {uploadedUrl && (
                <div className="mt-4 text-center">
                    <p className="text-green-600 font-semibold">Uploaded!</p>
                    <p className="text-blue-600 break-all">{uploadedUrl}</p>
                </div>
            )}
        </div>
    );
}
