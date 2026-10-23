import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // 1. Remove X-Powered-By header to prevent fingerprinting
    res.removeHeader('x-powered-by');
    res.removeHeader('X-Powered-By');

    // 2. Prevent MIME-sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 3. Clickjacking protection
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // 4. Disable buggy legacy XSS auditor in modern browsers
    res.setHeader('X-XSS-Protection', '0');

    // 5. Strict Transport Security (HSTS) - 1 year with subdomains and preload
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // 6. Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 7. Permissions Policy (disable unneeded browser APIs)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // 8. Content Security Policy (permits Swagger UI inline scripts while locking down external origins)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self'",
    );

    next();
  }
}
