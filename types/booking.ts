import type { BookingStatus, RoomType, RoomStatus } from '@prisma/client'

/**
 * Booking Types
 */
export interface Booking {
  id: string
  bookingId: string
  guestId: string
  roomId: string
  checkIn: Date | string
  checkOut: Date | string
  status: BookingStatus
  totalAmount: number
  createdAt: Date | string
  updatedAt: Date | string
  guest: Guest
  room: Room
  bill?: Bill
}

export interface Guest {
  id: string
  name: string
  phone: string
  email?: string | null
  address?: string | null
}

export interface Room {
  id: string
  roomNumber: string
  roomType: RoomType
  floor: number
  basePrice: number
  capacity: number
  status: RoomStatus
}

export interface Bill {
  id: string
  bookingId: string
  subtotal: number
  gst: number
  total: number
  paidAmount: number
  paymentStatus: string
}

export interface BookingFilters {
  status?: BookingStatus
  roomType?: RoomType
  dateFrom?: string
  dateTo?: string
  guestName?: string
  guestPhone?: string
  search?: string
}

export interface BookingCreateRequest {
  guestId?: string
  guest: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  roomId: string
  checkIn: string
  checkOut: string
  timeSlot: string
}

export interface BookingUpdateRequest {
  status?: BookingStatus
  checkIn?: string
  checkOut?: string
  roomId?: string
}
