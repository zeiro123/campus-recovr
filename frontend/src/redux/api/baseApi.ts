import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getUserLocalStorage } from "../../auth/auth";

const serverUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, "");
// Same-origin API in production builds (the Express server serves the built
// frontend); localhost fallback keeps dev pointed at the local API.
export const baseUrl = serverUrl
  ? `${serverUrl}/api`
  : import.meta.env.PROD
    ? "/api"
    : "http://localhost:5001/api";
// Origin for the realtime socket (no /api suffix). Empty string in production
// means same-origin — io() with no URI connects to the current origin.
export const serverOrigin = serverUrl
  ? serverUrl
  : import.meta.env.PROD
    ? ""
    : "http://localhost:5001";

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: fetchBaseQuery({
    baseUrl,
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = getUserLocalStorage();

      if (token) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: [
    "mylostItems",
    "myFoundItems",
    "users",
    "adminData",
    "testimonials",
    "services",
    "faqs",
    "recentActivity",
    "foundItems",
    "claims",
    "categories",
  ],

  endpoints: () => ({}),
});