// Middleware para limitar tasa de peticiones (rate limiting)

/**
 * Rate limiter simple en memoria
 * Para producción se recomienda usar redis
 */
class RateLimiter {
  constructor(windowMs = 15 * 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
  }

  middleware() {
    return (req, res, next) => {
      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      // Limpiar requests antiguos
      if (this.requests.has(key)) {
        const userRequests = this.requests.get(key);
        const recentRequests = userRequests.filter(
          timestamp => now - timestamp < this.windowMs
        );
        this.requests.set(key, recentRequests);
      } else {
        this.requests.set(key, []);
      }

      const userRequests = this.requests.get(key);

      // Verificar límite
      if (userRequests.length >= this.maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Demasiadas peticiones. Por favor, intenta más tarde.',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }

      // Agregar nueva request
      userRequests.push(now);
      this.requests.set(key, userRequests);

      // Agregar headers de rate limit
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', this.maxRequests - userRequests.length);
      res.setHeader('X-RateLimit-Reset', new Date(now + this.windowMs).toISOString());

      next();
    };
  }
}

// Limitadores para diferentes endpoints
const generalLimiter = new RateLimiter(15 * 60 * 1000, 100); // 100 requests por 15 minutos
const authLimiter = new RateLimiter(15 * 60 * 1000, 5); // 5 intentos de login por 15 minutos
const apiLimiter = new RateLimiter(15 * 60 * 1000, 50); // 50 requests API por 15 minutos

module.exports = {
  generalLimiter,
  authLimiter,
  apiLimiter
};
