export type UUID = string;
export type Price = number | string;

export type RoomStatus = 'FREE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE';

export interface RoomType {
    id: UUID;
    name: string;
    pricePerNight: Price;
    imageUrl?: string | null;
}

export interface Room {
    id: UUID;
    roomNumber: string | number;
    roomStatus: RoomStatus;
    imageUrl?: string | null;
    roomType: RoomType;

    // optional facilities 
    airConditioning?: boolean;
    internet?: boolean;
    tv?: boolean;
    balcony?: boolean;
    minibar?: boolean;
    heating?: boolean;
    safe?: boolean;
    hairDryer?: boolean;
    roomService?: boolean;
    restaurant?: boolean;
    petsAllowed?: boolean;
    freeWifi?: boolean;
    fitnessCentre?: boolean;
    flatScreenTv?: boolean;
    disabledFacilities?: boolean;
    nonSmoking?: boolean;
    shower?: boolean;
    towels?: boolean;
    linen?: boolean;
    telephone?: boolean;
    satelliteChannels?: boolean;
    desk?: boolean;
    wardrobe?: boolean;
    cityView?: boolean;
    electricKettle?: boolean;
    clothesRack?: boolean;
    socketNearBed?: boolean;
    ironingFacilities?: boolean;
    lift?: boolean;
    carpeted?: boolean;
    soundproofing?: boolean;
    wakeUpService?: boolean;
    allergyFreeRoom?: boolean;
    laptopSafe?: boolean;
    upperFloorAccessible?: boolean;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT';

export interface Booking {
    id: UUID;
    guestId?: UUID;
    roomId: UUID;
    guestName?: string;
    roomNumber?: string | number;
    checkInDate: string;
    checkOutDate: string;
    bookingStatus: BookingStatus;
    totalAmount?: Price;
}
