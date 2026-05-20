from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


class AppException(Exception):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST, details=None):
        self.message = message
        self.status_code = status_code
        self.details = details


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status.HTTP_404_NOT_FOUND)


class AuthenticationError(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status.HTTP_401_UNAUTHORIZED)


class AuthorizationError(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status.HTTP_403_FORBIDDEN)


class BusinessError(AppException):
    pass


class ValidationFailed(AppException):
    def __init__(self, message: str = "Validation error", details=None):
        super().__init__(message, status.HTTP_422_UNPROCESSABLE_ENTITY, details)


def _error_payload(message: str, status_code: int, details=None):
    payload = {
        "success": False,
        "message": message,
        "error": message,
        "status_code": status_code,
    }
    if details is not None:
        payload["details"] = details
        payload["errors"] = details
    return payload


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(_: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content=_error_payload(exc.message, exc.status_code, exc.details),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_error_payload(
                "Validation error",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                exc.errors(),
            ),
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_exception_handler(_: Request, __: SQLAlchemyError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload("Database error", status.HTTP_500_INTERNAL_SERVER_ERROR),
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(_: Request, __: Exception):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_error_payload("Internal server error", status.HTTP_500_INTERNAL_SERVER_ERROR),
        )

