import jwt, { SignOptions, Secret, JwtPayload } from "jsonwebtoken";

/* -------------------------------------------------------------------------- */
/*                               Access Token                                 */
/* -------------------------------------------------------------------------- */

export const generateAccessToken = (userId: string): string => {
  const secret: Secret = process.env.JWT_SECRET as string;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const payload = { userId };

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? "15m") as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, secret, options);
};

/* -------------------------------------------------------------------------- */
/*                              Refresh Token                                 */
/* -------------------------------------------------------------------------- */

export const generateRefreshToken = (userId: string): string => {
  const secret: Secret = process.env.JWT_REFRESH_SECRET as string;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
  }

  const payload = {
    userId,
    type: "refresh",
  };

  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, secret, options);
};

/* -------------------------------------------------------------------------- */
/*                          Verify Refresh Token                               */
/* -------------------------------------------------------------------------- */

export const verifyRefreshToken = (token: string): JwtPayload => {
  const secret: Secret = process.env.JWT_REFRESH_SECRET as string;

  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not defined in environment variables");
  }

  return jwt.verify(token, secret) as JwtPayload;
};
