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

// Ids and tokens come from the URL, so each one is encoded as a single path segment.
const enc = encodeURIComponent;

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
  api<BrowseResult>(`/search/browse/${enc(facet)}/${encodeURIComponent(value)}`, {
    query: { page, size, sort: "createdAt,desc" },
    auth: "none",
    revalidate,
  });

// ── Books & covers ───────────────────────────────────────────────────────
export const getOriginal = (id: string, revalidate?: number) => api<OriginalBookResponse>(`/books/original/${enc(id)}`, { auth: "none", revalidate });
export const getTranslated = (id: string, revalidate?: number) => api<TranslatedBookResponse>(`/books/translated/${enc(id)}`, { auth: "none", revalidate });
export const getTranslations = (originalId: string, revalidate?: number) =>
  api<TranslatedBookResponse[]>(`/books/original/${enc(originalId)}/translations`, { auth: "none", revalidate });
export const getCover = (id: string) => api<BookCoverResponse>(`/covers/${enc(id)}`, { auth: "none" });

// ── Likes (all calls need login; target is always a cover id) ────────────
export const likeTypeFor = (kind: "ORIGINAL" | "TRANSLATED"): LikeTargetType => (kind === "ORIGINAL" ? "ORIGINAL_COVER" : "TRANSLATED_COVER");
export const toggleLike = (type: LikeTargetType, coverId: string) =>
  api<LikeToggleResponse>(`/likes/${enc(type)}/${enc(coverId)}`, { method: "POST", auth: "required" });
export const likeStatus = (type: LikeTargetType, coverId: string) =>
  api<LikeStatusResponse>(`/likes/${enc(type)}/${enc(coverId)}/status`, { auth: "required" });

// ── Collections ──────────────────────────────────────────────────────────
export const myCollections = (page = 0, size = 100) =>
  api<SpringPage<CollectionSummaryResponse>>("/collections/my", { query: { page, size, sort: "createdAt,desc" }, auth: "required" });
export const publicCollections = (page = 0, size = 12, revalidate?: number) =>
  api<SpringPage<CollectionSummaryResponse>>("/collections/public", { query: { page, size, sort: "createdAt,desc" }, auth: "none", revalidate });
export const getCollection = (id: string) => api<CollectionResponse>(`/collections/${enc(id)}`, { auth: "required" });
// Never cached: once the owner makes the room private, the link must close on the next request.
export const getSharedCollection = (token: string) => api<CollectionResponse>(`/collections/shared/${enc(token)}`, { auth: "none", revalidate: false });
export const createCollection = (name: string, description?: string, visibility: CollectionVisibility = "PRIVATE") =>
  api<CollectionResponse>("/collections", { method: "POST", body: { name, description, visibility }, auth: "required" });
export const updateCollection = (id: string, body: { name?: string; description?: string; visibility?: CollectionVisibility }) =>
  api<CollectionResponse>(`/collections/${enc(id)}`, { method: "PUT", body, auth: "required" });
export const deleteCollection = (id: string) => api<void>(`/collections/${enc(id)}`, { method: "DELETE", auth: "required" });
export const addCollectionItem = (id: string, itemType: CollectionItemType, itemId: string) =>
  api<CollectionResponse>(`/collections/${enc(id)}/items`, { method: "POST", body: { itemType, itemId }, auth: "required" });
/** Takes the target (cover) id, not the item row id. */
export const removeCollectionItem = (id: string, coverId: string) =>
  api<CollectionResponse>(`/collections/${enc(id)}/items/${enc(coverId)}`, { method: "DELETE", auth: "required" });
/** The copy comes back with `items: []` although the items were copied — re-fetch it. */
export const duplicateCollection = (id: string) => api<CollectionResponse>(`/collections/${enc(id)}/duplicate`, { method: "POST", auth: "required" });
