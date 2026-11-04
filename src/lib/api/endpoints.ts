/**
 * Typed calls to coverage-backend, one function per endpoint the user web needs.
 * Shapes and quirks: docs/API_CONTRACT.md (derived from the backend source).
 */
import { api } from "./client";
import type {
  AuthResponse, BrowseResult, CollectionItemType, CollectionResponse, CollectionSummaryResponse, CollectionVisibility,
  LikeStatusResponse, LikeTargetType, LikeToggleResponse, LoginRequest, OriginalBookResponse, SearchResult, SignupRequest,
  SortOption, SpringPage, TranslatedBookResponse, UpdateProfileRequest, UserProfileResponse, BookCoverResponse,
} from "./types";

// ── Auth ─────────────────────────────────────────────────────────────────
export const signup = (body: SignupRequest) => api<AuthResponse>("/auth/signup", { method: "POST", body, auth: "none" });
export const login = (body: LoginRequest) => api<AuthResponse>("/auth/login", { method: "POST", body, auth: "none" });
export const logout = (refreshToken: string) => api<void>("/auth/logout", { method: "POST", body: { refreshToken }, auth: "none" });

// ── Users ────────────────────────────────────────────────────────────────
export const getMe = () => api<UserProfileResponse>("/users/me", { auth: "required" });
export const updateMe = (body: UpdateProfileRequest) => api<UserProfileResponse>("/users/me", { method: "PUT", body, auth: "required" });

// ── Search & browse ──────────────────────────────────────────────────────
export interface SearchQuery {
  query: string;
  countryCode?: string;
  languageCode?: string;
  yearFrom?: number;
  yearTo?: number;
  genre?: string;
  sortBy?: SortOption;
  page?: number;
  size?: number;
}
/** Full-text search. A blank query returns nothing — use a browse call instead. */
export const search = (q: SearchQuery, revalidate?: number) =>
  api<SearchResult>("/search", { query: { ...q }, auth: "none", revalidate });

/** Home feed: newest first. size 1–60. */
export const browseLatest = (page = 0, size = 24, revalidate?: number) =>
  api<BrowseResult>("/search/browse/latest", { query: { page, size }, auth: "none", revalidate });

/** Browse by one facet. No default order on the backend, so we always ask for newest first. */
export const browseBy = (facet: "country" | "year" | "genre" | "tag", value: string, page = 0, size = 24, revalidate?: number) =>
  api<BrowseResult>(`/search/browse/${facet}/${encodeURIComponent(value)}`, {
    query: { page, size, sort: "createdAt,desc" },
    auth: "none",
    revalidate,
  });

/** Search/browse ids are "original_<uuid>" etc. */
export function parseDocId(id: string): { kind: "ORIGINAL" | "TRANSLATED" | "REDESIGN"; uuid: string } | null {
  const m = id.match(/^(original|translated|redesign)_(.+)$/);
  return m ? { kind: m[1].toUpperCase() as "ORIGINAL" | "TRANSLATED" | "REDESIGN", uuid: m[2] } : null;
}

// ── Books & covers ───────────────────────────────────────────────────────
export const getOriginal = (id: string, revalidate?: number) => api<OriginalBookResponse>(`/books/original/${id}`, { auth: "none", revalidate });
export const getTranslated = (id: string, revalidate?: number) => api<TranslatedBookResponse>(`/books/translated/${id}`, { auth: "none", revalidate });
export const getTranslations = (originalId: string, revalidate?: number) =>
  api<TranslatedBookResponse[]>(`/books/original/${originalId}/translations`, { auth: "none", revalidate });
export const getCover = (id: string) => api<BookCoverResponse>(`/covers/${id}`, { auth: "none" });

// ── Likes (all calls need login; target is always a cover id) ────────────
export const likeTypeFor = (kind: "ORIGINAL" | "TRANSLATED"): LikeTargetType => (kind === "ORIGINAL" ? "ORIGINAL_COVER" : "TRANSLATED_COVER");
export const toggleLike = (type: LikeTargetType, coverId: string) =>
  api<LikeToggleResponse>(`/likes/${type}/${coverId}`, { method: "POST", auth: "required" });
export const likeStatus = (type: LikeTargetType, coverId: string) =>
  api<LikeStatusResponse>(`/likes/${type}/${coverId}/status`, { auth: "required" });

// ── Collections ──────────────────────────────────────────────────────────
export const myCollections = (page = 0, size = 100) =>
  api<SpringPage<CollectionSummaryResponse>>("/collections/my", { query: { page, size, sort: "createdAt,desc" }, auth: "required" });
export const publicCollections = (page = 0, size = 12, revalidate?: number) =>
  api<SpringPage<CollectionSummaryResponse>>("/collections/public", { query: { page, size, sort: "createdAt,desc" }, auth: "none", revalidate });
export const getCollection = (id: string) => api<CollectionResponse>(`/collections/${id}`, { auth: "required" });
export const getSharedCollection = (token: string) => api<CollectionResponse>(`/collections/shared/${token}`, { auth: "none", revalidate: 30 });
export const createCollection = (name: string, description?: string, visibility: CollectionVisibility = "PRIVATE") =>
  api<CollectionResponse>("/collections", { method: "POST", body: { name, description, visibility }, auth: "required" });
export const updateCollection = (id: string, body: { name?: string; description?: string; visibility?: CollectionVisibility }) =>
  api<CollectionResponse>(`/collections/${id}`, { method: "PUT", body, auth: "required" });
export const deleteCollection = (id: string) => api<void>(`/collections/${id}`, { method: "DELETE", auth: "required" });
export const addCollectionItem = (id: string, itemType: CollectionItemType, itemId: string) =>
  api<CollectionResponse>(`/collections/${id}/items`, { method: "POST", body: { itemType, itemId }, auth: "required" });
/** Takes the target (cover) id, not the item row id. */
export const removeCollectionItem = (id: string, coverId: string) =>
  api<CollectionResponse>(`/collections/${id}/items/${coverId}`, { method: "DELETE", auth: "required" });
/** The copy comes back with `items: []` although the items were copied — re-fetch it. */
export const duplicateCollection = (id: string) => api<CollectionResponse>(`/collections/${id}/duplicate`, { method: "POST", auth: "required" });
