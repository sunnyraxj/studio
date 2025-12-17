"use client"

import React from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type BreadcrumbProps = React.HTMLAttributes<HTMLElement>

export function Breadcrumb({ className, ...props }: BreadcrumbProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  return (
    <nav aria-label="breadcrumb" className={cn('text-sm font-medium text-muted-foreground', className)} {...props}>
      <ol className="flex items-center gap-1.5">
        <li>
          <Link href="/dashboard" className="hover:text-foreground">
            Home
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`
          const isLast = index === segments.length - 1

          return (
            <React.Fragment key={href}>
              <li className="flex items-center gap-1.5">
                <ChevronRight className="h-4 w-4" />
                <Link
                  href={href}
                  className={cn(
                    'capitalize',
                    isLast ? 'text-foreground pointer-events-none' : 'hover:text-foreground'
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {segment.replace(/-/g, ' ')}
                </Link>
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
