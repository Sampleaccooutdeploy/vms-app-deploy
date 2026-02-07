import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Protected routes and their required roles
const PROTECTED_ROUTES: Record<string, string[]> = {
    '/admin/super': ['super_admin'],
    '/admin/dept': ['department_admin'],
}

export async function middleware(request: NextRequest) {
    // First, refresh the session
    const response = await updateSession(request)

    const pathname = request.nextUrl.pathname

    // Check if this is a protected route
    const matchedRoute = Object.keys(PROTECTED_ROUTES).find(route =>
        pathname.startsWith(route)
    )

    if (matchedRoute) {
        // Create a Supabase client to check the user's role
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        )
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            // Not authenticated - redirect to login
            const loginUrl = new URL('/login', request.url)
            loginUrl.searchParams.set('redirect', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Check role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const allowedRoles = PROTECTED_ROUTES[matchedRoute]
        if (!profile || !allowedRoles.includes(profile.role || '')) {
            // Unauthorized - redirect to appropriate page
            if (profile?.role === 'department_admin') {
                return NextResponse.redirect(new URL('/admin/dept', request.url))
            } else if (profile?.role === 'security') {
                return NextResponse.redirect(new URL('/security', request.url))
            } else if (profile?.role === 'super_admin') {
                return NextResponse.redirect(new URL('/admin/super', request.url))
            }
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
