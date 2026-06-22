"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "@/components/lib/axiosConfig";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

interface RoomType {
    id: string;
    name: string;
    pricePerNight: number;
    imageUrl: string;
    description: string;
}

export default function RoomTypeEditPage() {
  const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const roomTypeId = params.id as string;

    const [roomType, setRoomType] = useState<RoomType | null>(null);
    const [name, setName] = useState("");
    const [price, setPrice] = useState<string>("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [description, setDescription] = useState("");

    const [features, setFeatures] = useState<Record<string, boolean>>({
        airConditioning: false,
        internet: false,
        toilet: false,
        bed: false,
        tv: false,
        balcony: false,
        minibar: false,
        heating: false,
        safe: false,
        hairDryer: false,
        roomService: false,
        soundproofing: false,
        freeWifi: false,
        fitnessCentre: false,
        flatScreenTv: false,
        facilitiesForDisabledGuests: false,
        nonSmokingRoom: false,
        shower: false,
        towels: false,
        telephone: false,
        satelliteChannels: false,
        desk: false,
        wardrobe: false,
        cityView: false,
        electricKettle: false,
        clothesRack: false,
        socketNearBed: false,
        ironingFacilities: false,
        lift: false,
        carpeted: false,
        wakeUpService: false,
        allergyFreeRoom: false,
        laptopSafe: false,
        upperFloorAccessible: false,
    });

    useEffect(() => {
        const fetchRoomType = async () => {
            try {
                const response = await api.get(`/api/room-types/${roomTypeId}`, {
                    headers: {
                        "Cache-Control": "no-store",
                    },
                });

                const data = response.data;
                setRoomType(data);
                setName(data.name);
                setPrice(
                    data.pricePerNight !== undefined && data.pricePerNight !== null
                        ? String(data.pricePerNight)
                        : ""
                );
                setDescription(data.description);

                const updatedFeatures: Record<string, boolean> = {};
                Object.keys(features).forEach((key) => {
                    updatedFeatures[key] = Boolean(data[key]);
                });
                setFeatures(updatedFeatures);
            } catch (error) {
                console.error("Failed to load room type:", error);
                alert("Failed to load room type.");
            }
        };

        if (roomTypeId) {
            fetchRoomType();
        }
    }, [roomTypeId]);

    const handleFeatureChange = (key: string) => {
        setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleUpdate = async () => {
        try {
            // 1) Update room type fields
            await api.put(`/api/room-types/${roomTypeId}`, {
                name,
                pricePerNight: price.trim() === "" ? null : Number(price),
                description,
                ...features,
            });

            // 2) Optional image upload
            if (imageFile) {
                const formData = new FormData();
                formData.append("image", imageFile);

                await api.post(
                    `/api/room-types/${roomTypeId}/upload-image`,
                    formData
                );
            }

            alert("✅ Room Type updated!");
            router.push("/room-types");

        } catch (err: any) {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Update failed.";
            alert(msg);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">✏️ Edit Room Type</h1>

            {roomType && (
                <div className="space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium">🏷️ Name:</span>
                        <input
                            type="text"
                            value={name || ""}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">📝 Description:</span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full p-2 border rounded"
                            rows={4}
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium">💶 Price per Night:</span>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="mt-1 block w-full p-2 border rounded"
                        />
                    </label>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(features).map(([key, value]) => (
                            <label key={key} className="flex items-center space-x-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={() => handleFeatureChange(key)}
                                />
                                <span>{getFeatureLabel(key)}: {value ? "Yes" : "No"}</span>
                            </label>
                        ))}
                    </div>

                    <label className="block mt-4">
                        <span className="text-sm font-medium">🖼️ Upload New Image (optional):</span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            className="mt-1 block w-full"
                        />
                    </label>

                    {roomType.imageUrl && (
                        <div className="mt-4">
                            <span className="text-sm font-medium block mb-1">Current Image:</span>
                            <img
                                src={roomType.imageUrl}
                                alt="Current Room Type"
                                className="w-64 h-64 object-cover rounded border"
                            />
                        </div>
                    )}

                    <div className="flex space-x-3 mt-4">
                        <button
                            onClick={handleUpdate}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                        >
                            💾 Save
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded"
                        >
                            🔙 Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function getFeatureLabel(key: string): string {
    const labels: Record<string, string> = {
        airConditioning: "❄️ Air Conditioning",
        internet: "🌐 Internet",
        toilet: "🚽 Toilet",
        bed: "🛏️ Bed",
        tv: "📺 TV",
        balcony: "🌅 Balcony",
        minibar: "🍷 Minibar",
        heating: "🔥 Heating",
        safe: "🔐 Safe",
        hairDryer: "💇 Hair Dryer",
        roomService: "🛎️ Room Service",
        soundproofing: "🔊 Soundproofing",
        freeWifi: "📡 Free WiFi",
        fitnessCentre: "🏋️ Fitness Centre",
        flatScreenTv: "📺 Flat Screen TV",
        facilitiesForDisabledGuests: "♿ Accessible",
        nonSmokingRoom: "🚭 Non-Smoking",
        shower: "🚿 Shower",
        towels: "🧼 Towels",
        telephone: "📞 Telephone",
        satelliteChannels: "📡 Satellite TV",
        desk: "🪑 Desk",
        wardrobe: "🚪 Wardrobe",
        cityView: "🏙️ City View",
        electricKettle: "☕ Electric Kettle",
        clothesRack: "👗 Clothes Rack",
        socketNearBed: "🔌 Socket Near Bed",
        ironingFacilities: "🧺 Ironing",
        lift: "🛗 Lift",
        carpeted: "🪟 Carpeted",
        wakeUpService: "⏰ Wake-up Service",
        allergyFreeRoom: "🚫 Allergy-Free",
        laptopSafe: "💻 Laptop Safe",
        upperFloorAccessible: "⬆️ Upper Floor Accessible",
    };
    return labels[key] || key;
}
