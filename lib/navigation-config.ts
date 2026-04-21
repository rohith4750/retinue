import type { IconType } from 'react-icons'
import {
  FaBox,
  FaBrain,
  FaBuilding,
  FaCalendarAlt,
  FaChartLine,
  FaDatabase,
  FaFileExcel,
  FaHistory,
  FaHome,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPlus,
  FaReceipt,
  FaUniversity,
  FaUser,
  FaUsers,
  FaUserShield,
  FaWallet,
  FaBell,
} from 'react-icons/fa'
import { USER_ROLES } from './constants'

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
export type PathMatchMode = 'exact' | 'startsWith'
export type MenuVariant = 'sky' | 'purple' | 'emerald' | 'amber' | 'blue' | 'slate'

export type MenuItemConfig = {
  href: string
  icon: IconType
  label: string
  roles: UserRole[]
  matchMode?: PathMatchMode
}

export type MenuSectionConfig = {
  id: string
  title: string
  variant: MenuVariant
  items: MenuItemConfig[]
}

export type PageInfoConfig = {
  title: string
  icon: IconType
  path: string
  matchMode?: PathMatchMode
}

export type QuickActionConfig = {
  label: string
  href: string
  icon: IconType
  path: string
  matchMode?: PathMatchMode
  excludePathContains?: string[]
}

export const MENU_SECTIONS: MenuSectionConfig[] = [
  {
    id: 'hotel',
    title: 'Hotel Operations',
    variant: 'sky',
    items: [
      { href: '/dashboard', icon: FaChartLine, label: 'Dashboard', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST], matchMode: 'exact' },
      { href: '/rooms', icon: FaHome, label: 'Rooms', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
      { href: '/bookings', icon: FaCalendarAlt, label: 'Bookings', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST], matchMode: 'exact' },
      { href: '/bookings/online', icon: FaCalendarAlt, label: 'Online Bookings', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST], matchMode: 'exact' },
      { href: '/bills', icon: FaReceipt, label: 'Bills', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
      { href: '/bookings/history', icon: FaHistory, label: 'Rooms History', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
    ],
  },
  {
    id: 'conventions',
    title: 'Conventions Operations',
    variant: 'purple',
    items: [
      { href: '/function-halls', icon: FaBuilding, label: 'Halls', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
      { href: '/function-halls/bookings', icon: FaCalendarAlt, label: 'Hall Bookings', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
      { href: '/function-halls/bookings/history', icon: FaHistory, label: 'Hall History', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    variant: 'emerald',
    items: [
      { href: '/analytics', icon: FaBrain, label: 'Predictions', roles: [USER_ROLES.SUPER_ADMIN] },
      { href: '/reports', icon: FaFileExcel, label: 'Reports', roles: [USER_ROLES.SUPER_ADMIN] },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    variant: 'amber',
    items: [
      { href: '/bank-accounts', icon: FaUniversity, label: 'Financial Accounts', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
      { href: '/expenses', icon: FaMoneyBillWave, label: 'Expenses', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
      { href: '/workforce', icon: FaWallet, label: 'Workforce', roles: [USER_ROLES.SUPER_ADMIN] },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    variant: 'blue',
    items: [
      { href: '/inventory', icon: FaBox, label: 'Stock & Assets', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
      { href: '/staff', icon: FaUsers, label: 'Staff', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
      { href: '/admin/alerts', icon: FaBell, label: 'Alert System', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN] },
      { href: '/assets', icon: FaMapMarkerAlt, label: 'Asset Locator', roles: [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST] },
    ],
  },
  {
    id: 'settings',
    title: 'Settings',
    variant: 'slate',
    items: [
      { href: '/auth/users', icon: FaUserShield, label: 'User Management', roles: [USER_ROLES.SUPER_ADMIN] },
      { href: '/admin/db-analytics', icon: FaDatabase, label: 'DB Analytics', roles: [USER_ROLES.SUPER_ADMIN] },
    ],
  },
]

export const PAGE_INFO_CONFIG: PageInfoConfig[] = [
  { title: 'New Hall Booking', icon: FaPlus, path: '/function-halls/bookings/new' },
  { title: 'Hall Bookings', icon: FaCalendarAlt, path: '/function-halls/bookings' },
  { title: 'Function Hall', icon: FaBuilding, path: '/function-halls' },
  { title: 'New Booking', icon: FaPlus, path: '/bookings/new' },
  { title: 'Booking History', icon: FaHistory, path: '/bookings/history' },
  { title: 'Online Bookings', icon: FaCalendarAlt, path: '/bookings/online', matchMode: 'exact' },
  { title: 'Bookings', icon: FaCalendarAlt, path: '/bookings' },
  { title: 'Dashboard', icon: FaChartLine, path: '/dashboard' },
  { title: 'Rooms', icon: FaHome, path: '/rooms' },
  { title: 'Staff Management', icon: FaUsers, path: '/staff' },
  { title: 'Stock & Assets', icon: FaBox, path: '/inventory' },
  { title: 'User Management', icon: FaUserShield, path: '/auth/users' },
  { title: 'Revenue & Expenses', icon: FaMoneyBillWave, path: '/expenses' },
  { title: 'Workforce & Salary', icon: FaUsers, path: '/workforce' },
  { title: 'Asset Locator', icon: FaBox, path: '/assets' },
  { title: 'My Profile', icon: FaUser, path: '/profile' },
  { title: 'Bill Details', icon: FaCalendarAlt, path: '/bills' },
  { title: 'Alert System', icon: FaBell, path: '/admin/alerts' },
]

export const TOOLBAR_QUICK_ACTIONS: QuickActionConfig[] = [
  {
    label: 'New Booking',
    href: '/bookings/new',
    icon: FaPlus,
    path: '/bookings',
    excludePathContains: ['/new'],
  },
  {
    label: 'Book Room',
    href: '/bookings/new',
    icon: FaPlus,
    path: '/rooms',
  },
]

export const DEFAULT_PAGE_INFO = {
  title: 'Hotel The Retinue & Butchiraju Conventions',
  icon: FaChartLine,
}

export function matchesPath(pathname: string | null, path: string, matchMode: PathMatchMode = 'startsWith'): boolean {
  if (!pathname) return false
  return matchMode === 'exact' ? pathname === path : pathname.startsWith(path)
}

export function getPageInfo(pathname: string | null) {
  const page = PAGE_INFO_CONFIG.find((item) => matchesPath(pathname, item.path, item.matchMode))
  return page || DEFAULT_PAGE_INFO
}

export function getQuickAction(pathname: string | null): QuickActionConfig | null {
  return (
    TOOLBAR_QUICK_ACTIONS.find((action) => {
      if (!matchesPath(pathname, action.path, action.matchMode)) return false
      if (!action.excludePathContains?.length) return true
      return !action.excludePathContains.some((value) => pathname?.includes(value))
    }) || null
  )
}

export function isMenuItemActive(pathname: string | null, item: MenuItemConfig): boolean {
  return matchesPath(pathname, item.href, item.matchMode)
}

export function getMenuSectionsForRole(role: string): MenuSectionConfig[] {
  return MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role as UserRole)),
  })).filter((section) => section.items.length > 0)
}
