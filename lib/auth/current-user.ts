import { authProvider } from "./provider";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";

export const getCurrentUser = cache(async function getCurrentUser() {
  try {
    return await authProvider.getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    console.error("Authentication session validation failed:", {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
});
