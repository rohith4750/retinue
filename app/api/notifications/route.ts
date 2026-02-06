
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, requireAuth } from '@/lib/api-helpers'

// GET /api/notifications - Get current user's notifications
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult
    const userId = (authResult as any).userId

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    const where: any = { userId }
    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    })

    return Response.json(successResponse({ notifications, unreadCount }))
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return Response.json(errorResponse('SERVER_ERROR', 'Failed to fetch notifications'), { status: 500 })
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth()(request)
    if (authResult instanceof Response) return authResult
    const userId = (authResult as any).userId

    const body = await request.json()
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      })
      return Response.json(successResponse(null, 'All notifications marked as read'))
    }

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await prisma.notification.updateMany({
        where: { userId, id: { in: notificationIds } },
        data: { isRead: true },
      })
      return Response.json(successResponse(null, 'Notifications marked as read'))
    }

    return Response.json(errorResponse('VALIDATION_ERROR', 'No notification IDs provided'), { status: 400 })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return Response.json(errorResponse('SERVER_ERROR', 'Failed to update notifications'), { status: 500 })
  }
}
