'use client'

import type React from 'react'
import { usePathname } from 'next/navigation'

import StaffLayout from '@/components/staff-layout'

type Props = {
  children: React.ReactNode
}

export default function StaffSegmentLayout({ children }: Props) {
  const pathname = usePathname()

  const isAuthPage =
    pathname === '/staff/login' ||
    pathname === '/staff/signup' ||
    pathname?.startsWith('/staff/setup-password')

  if (isAuthPage) {
    return children
  }

  return <StaffLayout>{children}</StaffLayout>
}
