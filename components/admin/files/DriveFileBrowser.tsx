"use client";

import { Input } from "@/components/ui/input";
import type { IconHandle } from "@animateicons/react";
import {
  LuChevronRight as AnimatedChevronRightIcon,
  LuCloudUpload as AnimatedCloudIcon,
  LuEllipsisVertical as AnimatedEllipsisVerticalIcon,
  LuExternalLink as AnimatedExternalLinkIcon,
  LuFileText as AnimatedFileTextIcon,
  LuFolder as AnimatedFolderIcon,
  LuImage as AnimatedImageIcon,
  LuInfo as AnimatedInfoIcon,
  LuPencil as AnimatedPencilIcon,
  LuPlus as AnimatedPlusIcon,
  LuRefreshCw as AnimatedRefreshIcon,
  LuSettings2 as AnimatedFolderSettingsIcon,
  LuTrash2 as AnimatedTrashIcon,
  LuUpload as AnimatedUploadIcon,
  LuArrowUpDown,
  LuChevronDown,
  LuChevronUp,
} from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { FileUploadField } from "@/components/forms/FileUploadField";
import { fieldStyles as styles } from "@/components/forms/graduate-tracer/shared";
import { useReducedMotionPreference } from "@/lib/hooks/use-reduced-motion-preference";
import ConfirmationDialog from "@/components/ui/ConfirmationDialog";
import FormModal from "@/components/ui/FormModal";
import LoadingState from "@/components/ui/LoadingState";
import Modal, { ModalActions } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/components/ui/Toast";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import type { DriveBreadcrumb, DriveBrowserItem } from "@/types";
import type { SortDirection } from "@/components/ui/sortable-table-head";

type FileSortKey = "name" | "size" | "type" | "modified";

function FileSortHeader({
  children,
  active,
  direction,
  onSort,
}: {
  children: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
}) {
  return (
    <span
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
      role="columnheader"
    >
      <button
        type="button"
        onClick={onSort}
        className="flex items-center gap-1.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
        {active ? (
          direction === "asc" ? (
            <LuChevronUp aria-hidden="true" size={14} />
          ) : (
            <LuChevronDown aria-hidden="true" size={14} />
          )
        ) : (
          <LuArrowUpDown aria-hidden="true" size={14} className="opacity-50" />
        )}
      </button>
    </span>
  );
}

interface FolderPayload {
  folderId: string;
  breadcrumbs: DriveBreadcrumb[];
  items: DriveBrowserItem[];
  nextPageToken: string | null;
  uploadAllowed: boolean;
}

const googlePreviewTypes = new Set([
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.drawing",
]);

function canPreviewInBrowser(mimeType: string) {
  return (
    mimeType === "application/pdf" ||
    mimeType.startsWith("image/") ||
    mimeType.startsWith("text/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("video/") ||
    googlePreviewTypes.has(mimeType)
  );
}

function formatSize(size: number | null) {
  if (size === null) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(1)} GB`;
}

const googleFileTypes: Record<string, string> = {
  "application/vnd.google-apps.document": "Google Doc",
  "application/vnd.google-apps.spreadsheet": "Google Sheet",
  "application/vnd.google-apps.presentation": "Google Slides",
  "application/vnd.google-apps.drawing": "Google Drawing",
};

function formatFileType(item: DriveBrowserItem) {
  if (item.isFolder) return "Folder";

  const googleFileType = googleFileTypes[item.mimeType];
  if (googleFileType) return googleFileType;

  const extension = item.name.match(/\.([^./]+)$/)?.[1];
  if (extension) return extension.toUpperCase();

  return item.mimeType.split("/").at(-1)?.toUpperCase() ?? "File";
}

const FileIcon = forwardRef<IconHandle, { item: DriveBrowserItem }>(
  function FileIcon({ item }, ref) {
    if (item.isFolder) {
      return (
        <AnimatedFolderIcon
          ref={ref}
          className="text-warning"
          size={22}
          duration={0.65}
        />
      );
    }

    if (item.mimeType.startsWith("image/")) {
      return (
        <AnimatedImageIcon
          ref={ref}
          className="text-secondary-foreground"
          size={22}
          duration={0.65}
        />
      );
    }

    return (
      <AnimatedFileTextIcon
        ref={ref}
        className="text-muted-foreground"
        size={22}
        duration={0.65}
      />
    );
  },
);

function FileSearchField({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState("");
  const debouncedValue = useDebouncedValue(value, 200);
  const lastEmittedValueRef = useRef(debouncedValue);

  useEffect(() => {
    if (debouncedValue === lastEmittedValueRef.current) return;

    lastEmittedValueRef.current = debouncedValue;
    onSearch(debouncedValue.trim());
  }, [debouncedValue, onSearch]);

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Search all files
      </span>
      <SearchInput
        value={value}
        maxLength={100}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search file or folder name"
      />
    </label>
  );
}

export default function DriveFileBrowser() {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotionPreference();
  const [folder, setFolder] = useState<FolderPayload | null>(null);
  const folderIdRef = useRef<string | undefined>(undefined);
  const latestRequestIdRef = useRef(0);
  const itemIconRefs = useRef(new Map<string, IconHandle>());
  const [items, setItems] = useState<DriveBrowserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInputKey, setSearchInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<DriveBrowserItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [renamingItem, setRenamingItem] = useState<DriveBrowserItem | null>(
    null,
  );
  const [renameValue, setRenameValue] = useState("");
  const [movingItems, setMovingItems] = useState<DriveBrowserItem[]>([]);
  const [moveBrowser, setMoveBrowser] = useState<FolderPayload | null>(null);
  const [moveAdminRootId, setMoveAdminRootId] = useState("");
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [infoItem, setInfoItem] = useState<DriveBrowserItem | null>(null);
  const [deletingItems, setDeletingItems] = useState<DriveBrowserItem[]>([]);
  const [mutating, setMutating] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [sortKey, setSortKey] = useState<FileSortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    const requestId = ++latestRequestIdRef.current;

    async function loadInitialFolder() {
      try {
        const query = new URLSearchParams({
          sort: "name",
          direction: "asc",
        });
        const response = await fetch(`/api/admin/files?${query}`, {
          cache: "no-store",
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.message);
        if (requestId !== latestRequestIdRef.current) return;

        folderIdRef.current = result.data.folderId;
        setFolder(result.data);
        setItems(result.data.items);
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) return;

        showToast({
          message:
            error instanceof Error ? error.message : "Failed to load files.",
          type: "error",
        });
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      }
    }

    void loadInitialFolder();

    return () => {
      latestRequestIdRef.current += 1;
    };
  }, [showToast]);

  useEffect(() => {
    if (!activeMenuId) return;

    function closeMenu(event: MouseEvent) {
      if (!(event.target as Element).closest("[data-file-menu]")) {
        setActiveMenuId(null);
      }
    }

    window.addEventListener("mousedown", closeMenu);
    return () => window.removeEventListener("mousedown", closeMenu);
  }, [activeMenuId]);

  const loadFiles = useCallback(
    async ({
      folderId,
      searchQuery,
      pageToken,
      append = false,
      requestedSort = sortKey,
      requestedDirection = sortDirection,
    }: {
      folderId?: string;
      searchQuery?: string;
      pageToken?: string;
      append?: boolean;
      requestedSort?: FileSortKey;
      requestedDirection?: SortDirection;
    } = {}) => {
      const requestId = ++latestRequestIdRef.current;

      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const query = new URLSearchParams();
        if (folderId) query.set("folder", folderId);
        if (searchQuery) query.set("search", searchQuery);
        if (pageToken) query.set("pageToken", pageToken);
        query.set("sort", requestedSort);
        query.set("direction", requestedDirection);

        const response = await fetch(`/api/admin/files?${query}`, {
          cache: "no-store",
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.message);
        if (requestId !== latestRequestIdRef.current) return;

        if (searchQuery) {
          setItems(result.data.items);
        } else {
          folderIdRef.current = result.data.folderId;
          setFolder(result.data);
          setItems((current) =>
            append ? [...current, ...result.data.items] : result.data.items,
          );
        }
      } catch (error) {
        if (requestId !== latestRequestIdRef.current) return;

        showToast({
          message:
            error instanceof Error ? error.message : "Failed to load files.",
          type: "error",
        });
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [showToast, sortDirection, sortKey],
  );

  const handleSort = (key: FileSortKey) => {
    const direction =
      sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDirection(direction);
    setSelectedItemIds(new Set());
    void loadFiles({
      folderId: folderIdRef.current,
      searchQuery: searchQuery || undefined,
      requestedSort: key,
      requestedDirection: direction,
    });
  };

  const handleSearch = useCallback(
    (query: string) => {
      setSelectedItemIds(new Set());
      setSearchQuery(query);
      void loadFiles({
        folderId: folderIdRef.current,
        searchQuery: query || undefined,
      });
    },
    [loadFiles],
  );

  function openFolder(folderId: string) {
    setSelectedItemIds(new Set());
    setSearchQuery("");
    setSearchInputKey((current) => current + 1);
    void loadFiles({ folderId });
  }

  function openFile(item: DriveBrowserItem) {
    const useNativeMobileViewer =
      canPreviewInBrowser(item.mimeType) &&
      window.matchMedia("(max-width: 767px)").matches;

    if (useNativeMobileViewer) {
      const previewTab = window.open("", "_blank");

      if (previewTab) {
        previewTab.opener = null;
        previewTab.location.href = `/api/admin/files/${encodeURIComponent(item.id)}/content`;
        return;
      }
    }

    setPreview(item);
  }

  function openBrowserItem(item: DriveBrowserItem) {
    if (item.isFolder) openFolder(item.id);
    else openFile(item);
  }

  async function prepareFolders() {
    setPreparing(true);

    try {
      const response = await fetch("/api/admin/files/initialize", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message);

      showToast({
        message: `Synced ${result.data.sync.items} Drive items and prepared folders for ${result.data.studies} studies.`,
        type: "success",
      });
      await loadFiles({ folderId: folderIdRef.current });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to prepare folders.",
        type: "error",
      });
    } finally {
      setPreparing(false);
    }
  }

  async function uploadAdminFiles(event: React.FormEvent) {
    event.preventDefault();

    if (uploadFiles.length === 0 || !folderIdRef.current) return;
    setUploading(true);

    try {
      const targetFolderId = folderIdRef.current;
      for (let index = 0; index < uploadFiles.length; index += 3) {
        await Promise.all(
          uploadFiles.slice(index, index + 3).map(async (file) => {
            const formData = new FormData();
            formData.set("file", file);
            formData.set("folderId", targetFolderId);

            const response = await fetch("/api/admin/files/upload", {
              method: "POST",
              credentials: "include",
              body: formData,
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message);
          }),
        );
      }

      showToast({
        message: `${uploadFiles.length} ${uploadFiles.length === 1 ? "file" : "files"} uploaded.`,
        type: "success",
      });
      setUploadFiles([]);
      setShowUpload(false);
      await loadFiles({ folderId: folderIdRef.current });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to upload files.",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  }

  async function updateItem(
    item: DriveBrowserItem,
    body: Record<string, string>,
    successMessage: string,
  ) {
    setMutating(true);

    try {
      const response = await fetch(`/api/admin/files/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      showToast({ message: successMessage, type: "success" });
      await loadFiles({ folderId: folderIdRef.current });
      return true;
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to update item.",
        type: "error",
      });
      return false;
    } finally {
      setMutating(false);
    }
  }

  async function renameItem(event: React.FormEvent) {
    event.preventDefault();
    if (!renamingItem || !renameValue.trim()) return;

    if (
      await updateItem(
        renamingItem,
        { action: "rename", name: renameValue },
        "Item renamed.",
      )
    ) {
      setRenamingItem(null);
    }
  }

  async function openMoveDialog(itemsToMove: DriveBrowserItem[]) {
    if (itemsToMove.length === 0) return;
    setMovingItems(itemsToMove);
    setMoveBrowser(null);
    setLoadingDestinations(true);

    try {
      const response = await fetch(
        `/api/admin/files/folders?current=${encodeURIComponent(itemsToMove[0].id)}`,
        { cache: "no-store", credentials: "include" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMoveAdminRootId(result.data.adminRootId);
      await loadMoveFolder(
        result.data.adminRootId,
        itemsToMove.map((item) => item.id),
      );
    } catch (error) {
      setMovingItems([]);
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to load folders.",
        type: "error",
      });
    } finally {
      setLoadingDestinations(false);
    }
  }

  async function loadMoveFolder(folderId: string, excludedItemIds?: string[]) {
    setLoadingDestinations(true);

    try {
      const response = await fetch(
        `/api/admin/files?folder=${encodeURIComponent(folderId)}`,
        { cache: "no-store", credentials: "include" },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMoveBrowser({
        ...result.data,
        items: result.data.items.filter(
          (item: DriveBrowserItem) =>
            item.isFolder &&
            !(
              excludedItemIds ?? movingItems.map((movingItem) => movingItem.id)
            ).includes(item.id),
        ),
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to open folder.",
        type: "error",
      });
    } finally {
      setLoadingDestinations(false);
    }
  }

  async function moveItem(event: React.FormEvent) {
    event.preventDefault();
    if (movingItems.length === 0 || !moveBrowser) return;
    setMutating(true);

    try {
      for (const item of movingItems) {
        const response = await fetch(`/api/admin/files/${item.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "move",
            destinationId: moveBrowser.folderId,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
      }

      showToast({
        message: `${movingItems.length === 1 ? "Item" : "Items"} moved.`,
        type: "success",
      });
      setMovingItems([]);
      setSelectedItemIds(new Set());
      await loadFiles({ folderId: folderIdRef.current });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to move items.",
        type: "error",
      });
    } finally {
      setMutating(false);
    }
  }

  async function deleteItem() {
    if (deletingItems.length === 0) return;
    setMutating(true);

    try {
      for (const item of deletingItems) {
        const response = await fetch(`/api/admin/files/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
      }

      showToast({
        message: `${deletingItems.length === 1 ? "Item" : "Items"} deleted.`,
        type: "success",
      });
      setDeletingItems([]);
      setSelectedItemIds(new Set());
      await loadFiles({ folderId: folderIdRef.current });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to delete item.",
        type: "error",
      });
    } finally {
      setMutating(false);
    }
  }

  async function createFolder(event: React.FormEvent) {
    event.preventDefault();
    if (!folderIdRef.current || !newFolderName.trim()) return;
    setCreatingFolder(true);

    try {
      const response = await fetch("/api/admin/files/folder", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentId: folderIdRef.current,
          name: newFolderName,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setNewFolderName("");
      setShowNewFolder(false);
      showToast({ message: "Folder created.", type: "success" });
      await loadFiles({ folderId: folderIdRef.current });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : "Failed to create folder.",
        type: "error",
      });
    } finally {
      setCreatingFolder(false);
    }
  }

  const isSearching = Boolean(searchQuery);
  const canUpload = !isSearching && Boolean(folder?.uploadAllowed);
  const selectedItems = items.filter((item) => selectedItemIds.has(item.id));
  const allVisibleItemsSelected =
    items.length > 0 && items.every((item) => selectedItemIds.has(item.id));
  const someVisibleItemsSelected =
    !allVisibleItemsSelected &&
    items.some((item) => selectedItemIds.has(item.id));
  const moveBreadcrumbs = moveBrowser
    ? moveBrowser.breadcrumbs.slice(
        Math.max(
          0,
          moveBrowser.breadcrumbs.findIndex(
            (crumb) => crumb.id === moveAdminRootId,
          ),
        ),
      )
    : [];

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/80 p-5 shadow-lg">
        <div className="min-w-0 flex-1 basis-72">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Files
          </h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground sm:text-base">
            Browse and preview files stored in the Placement Tracer System
            Drive.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setShowSyncInfo(true)}
          aria-label="About Drive synchronization"
          className="text-muted-foreground"
        >
          <AnimatedInfoIcon size={19} />
        </Button>
      </header>
      <section className="rounded-3xl border border-border bg-card shadow-sm">
        <div className={loading ? "p-5" : "border-b border-border p-5"}>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <FileSearchField key={searchInputKey} onSearch={handleSearch} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={!canUpload}
                onClick={() => setShowUpload(true)}
                title={
                  canUpload
                    ? "Upload files to this folder"
                    : "Open a folder inside Admin Files to upload"
                }
                className="whitespace-nowrap rounded-2xl text-muted-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                <AnimatedUploadIcon size={17} /> Upload files
              </Button>
              <Button
                type="button"
                variant="default"
                size="lg"
                disabled={!canUpload}
                onClick={() => setShowNewFolder(true)}
                className="whitespace-nowrap rounded-2xl disabled:cursor-not-allowed disabled:opacity-45"
              >
                <AnimatedPlusIcon size={17} /> New folder
              </Button>
            </div>
          </div>

          {!isSearching && folder && (
            <nav
              aria-label="Drive folder path"
              className="mt-4 flex flex-wrap items-center gap-1 text-sm"
            >
              {folder.breadcrumbs.map((crumb, index) => (
                <div key={crumb.id} className="flex min-w-0 items-center gap-1">
                  {index > 0 && (
                    <AnimatedChevronRightIcon
                      className="shrink-0 text-primary"
                      size={16}
                      animated={false}
                    />
                  )}
                  <Button
                    type="button"
                    disabled={crumb.id === folder.folderId}
                    aria-current={
                      crumb.id === folder.folderId ? "page" : undefined
                    }
                    onClick={() => openFolder(crumb.id)}
                    className={`truncate rounded-lg px-2 py-1 enabled:hover:bg-data-hover enabled:hover:text-muted-foreground ${
                      index === folder.breadcrumbs.length - 1
                        ? "cursor-default font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {crumb.name}
                  </Button>
                </div>
              ))}
            </nav>
          )}
        </div>

        {loading ? (
          <LoadingState
            message={isSearching ? "Searching files..." : "Loading files..."}
          />
        ) : items.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <AnimatedCloudIcon
              size={36}
              animated={false}
              className="mb-3 text-primary"
            />
            <p className="font-semibold text-foreground">
              {isSearching ? "No matching files found" : "This folder is empty"}
            </p>
            <p className="mt-1 text-sm">
              {isSearching
                ? "Try a different file or folder name."
                : "Files and folders added in Google Drive will appear here."}
            </p>
          </div>
        ) : (
          <div>
            {canUpload && (
              <label className="flex items-center gap-2 border-b border-border bg-data-header px-5 py-3 text-sm font-medium text-muted-foreground md:hidden">
                <Checkbox
                  checked={allVisibleItemsSelected}
                  indeterminate={someVisibleItemsSelected}
                  onCheckedChange={(checked) =>
                    setSelectedItemIds(
                      checked
                        ? new Set(items.map((item) => item.id))
                        : new Set(),
                    )
                  }
                />
                Select all
              </label>
            )}
            {canUpload && selectedItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-data-header px-5 py-3">
                <span className="mr-auto text-sm font-semibold text-foreground">
                  {selectedItems.length} selected
                </span>
                <Button
                  type="button"
                  onClick={() => void openMoveDialog(selectedItems)}
                  variant="outline"
                  size="sm"
                >
                  <AnimatedChevronRightIcon size={15} /> Move
                </Button>
                <Button
                  type="button"
                  onClick={() => setDeletingItems(selectedItems)}
                  variant="destructive"
                  size="sm"
                >
                  <AnimatedTrashIcon size={15} /> Delete
                </Button>
                <Button
                  type="button"
                  onClick={() => setSelectedItemIds(new Set())}
                  variant="ghost"
                  size="sm"
                >
                  Clear Selection
                </Button>
              </div>
            )}
            <div
              className={`hidden items-center gap-3 border-b border-border bg-data-header px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:grid ${
                canUpload
                  ? "lg:grid-cols-[auto_auto_minmax(0,1fr)_7rem_9rem_11rem_auto]"
                  : "lg:grid-cols-[auto_auto_minmax(0,1fr)_7rem_9rem_11rem]"
              }`}
            >
              {canUpload ? (
                <Checkbox
                  aria-label="Select all files and folders"
                  checked={allVisibleItemsSelected}
                  indeterminate={someVisibleItemsSelected}
                  onCheckedChange={(checked) =>
                    setSelectedItemIds(
                      checked
                        ? new Set(items.map((item) => item.id))
                        : new Set(),
                    )
                  }
                />
              ) : (
                <span />
              )}
              <span aria-hidden="true" className="w-5" />
              <FileSortHeader
                active={sortKey === "name"}
                direction={sortDirection}
                onSort={() => handleSort("name")}
              >
                Name
              </FileSortHeader>
              <FileSortHeader
                active={sortKey === "size"}
                direction={sortDirection}
                onSort={() => handleSort("size")}
              >
                Size
              </FileSortHeader>
              <FileSortHeader
                active={sortKey === "type"}
                direction={sortDirection}
                onSort={() => handleSort("type")}
              >
                File type
              </FileSortHeader>
              <FileSortHeader
                active={sortKey === "modified"}
                direction={sortDirection}
                onSort={() => handleSort("modified")}
              >
                Modified
              </FileSortHeader>
              {canUpload && <span className="w-9 text-center">Menu</span>}
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div
                  key={item.id}
                  data-file-row
                  onPointerUp={(event) => {
                    itemIconRefs.current.get(item.id)?.stopAnimation();
                    if (
                      event.pointerType === "mouse" ||
                      (event.target as HTMLElement).closest(
                        "button,input,[role='checkbox'],[data-file-menu]",
                      )
                    ) {
                      return;
                    }
                    openBrowserItem(item);
                  }}
                  onPointerDown={(event) => {
                    if (!reduceMotion && event.pointerType !== "mouse") {
                      itemIconRefs.current.get(item.id)?.startAnimation();
                    }
                  }}
                  onPointerEnter={() =>
                    !reduceMotion &&
                    itemIconRefs.current.get(item.id)?.startAnimation()
                  }
                  onPointerLeave={() =>
                    itemIconRefs.current.get(item.id)?.stopAnimation()
                  }
                  onPointerCancel={() =>
                    itemIconRefs.current.get(item.id)?.stopAnimation()
                  }
                  onDoubleClick={(event) => {
                    if (
                      (event.target as HTMLElement).closest(
                        "button,input,[role='checkbox'],[data-file-menu]",
                      )
                    ) {
                      return;
                    }
                    openBrowserItem(item);
                  }}
                  className={`group/file-row relative grid w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-data-hover last:rounded-b-[calc(var(--radius-3xl)-1px)] ${
                    canUpload
                      ? "grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:grid-cols-[auto_auto_minmax(0,1fr)_7rem_9rem_11rem_auto]"
                      : "grid-cols-[auto_auto_minmax(0,1fr)] lg:grid-cols-[auto_auto_minmax(0,1fr)_7rem_9rem_11rem]"
                  } ${activeMenuId === item.id ? "z-60" : "z-0"}`}
                >
                  {canUpload ? (
                    <Checkbox
                      aria-label={`Select ${item.name}`}
                      checked={selectedItemIds.has(item.id)}
                      onClick={(event) => event.stopPropagation()}
                      onCheckedChange={(checked) => {
                        setSelectedItemIds((current) => {
                          const next = new Set(current);
                          if (checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                      className="relative z-10"
                    />
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    data-file-open
                    variant="plain"
                    animateIcon={false}
                    onPointerUp={(event) => {
                      event.stopPropagation();
                      if (event.pointerType !== "mouse") openBrowserItem(item);
                    }}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      openBrowserItem(item);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      openBrowserItem(item);
                    }}
                    aria-label={`${item.isFolder ? "Open folder" : "Open file"} ${item.name}`}
                    className="col-span-2 h-auto w-full min-w-0 justify-start gap-3 text-left"
                  >
                    <span className="flex shrink-0 items-center self-center">
                      <FileIcon
                        ref={(handle) => {
                          if (handle) itemIconRefs.current.set(item.id, handle);
                          else itemIconRefs.current.delete(item.id);
                        }}
                        item={item}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {item.name}
                      </span>
                    </span>
                  </Button>
                  <span className="hidden text-sm text-muted-foreground lg:block">
                    {item.isFolder ? "" : formatSize(item.size)}
                  </span>
                  <span className="hidden truncate text-sm text-muted-foreground lg:block">
                    {formatFileType(item)}
                  </span>
                  <span className="hidden text-sm text-muted-foreground lg:block">
                    {item.modifiedTime
                      ? new Date(item.modifiedTime).toLocaleDateString(
                          "en-PH",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )
                      : "—"}
                  </span>
                  {canUpload && (
                    <div
                      data-file-menu
                      onClick={(event) => event.stopPropagation()}
                      className={`relative flex shrink-0 items-center ${
                        activeMenuId === item.id ? "z-60" : "z-10"
                      }`}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setActiveMenuId((current) =>
                            current === item.id ? null : item.id,
                          )
                        }
                        aria-label={`Open menu for ${item.name}`}
                        aria-expanded={activeMenuId === item.id}
                        className="text-muted-foreground hover:bg-card hover:text-foreground aria-expanded:bg-card aria-expanded:text-foreground"
                      >
                        <AnimatedEllipsisVerticalIcon size={18} />
                      </Button>
                      {activeMenuId === item.id && (
                        <div className="absolute top-[calc(100%+0.25rem)] right-0 z-60 w-44 overflow-hidden rounded-xl border border-border bg-card p-2 shadow-xl">
                          <Button
                            type="button"
                            variant="ghost"
                            size="menu"
                            onClick={() => {
                              setActiveMenuId(null);
                              setRenameValue(item.name);
                              setRenamingItem(item);
                            }}
                          >
                            <AnimatedPencilIcon size={15} />
                            Rename
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="menu"
                            onClick={() => {
                              setActiveMenuId(null);
                              void openMoveDialog([item]);
                            }}
                          >
                            <AnimatedChevronRightIcon size={15} />
                            Move
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="menu"
                            onClick={() => {
                              setActiveMenuId(null);
                              setInfoItem(item);
                            }}
                          >
                            <AnimatedInfoIcon size={15} />
                            Info
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="menu"
                            onClick={() => {
                              setActiveMenuId(null);
                              setDeletingItems([item]);
                            }}
                          >
                            <AnimatedTrashIcon size={15} />
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isSearching && folder?.nextPageToken && (
          <div className="border-t border-border p-4 text-center">
            <Button
              type="button"
              variant="outline"
              disabled={loadingMore}
              onClick={() =>
                void loadFiles({
                  folderId: folder.folderId,
                  pageToken: folder.nextPageToken ?? undefined,
                  append: true,
                })
              }
            >
              <AnimatedRefreshIcon
                animated={!loadingMore}
                className={loadingMore ? "animate-spin" : ""}
              />
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </section>

      <FormModal
        open={showUpload}
        onClose={() => {
          setShowUpload(false);
          setUploadFiles([]);
        }}
        title="Upload admin files"
        description={`Select up to 10 files to upload directly into “${folder?.breadcrumbs.at(-1)?.name ?? "the selected Admin Files folder"}”. They will appear in this directory after the upload finishes.`}
        width="md"
        fitContent
        showCloseButton={false}
        shouldConfirmClose={uploadFiles.length > 0}
        confirmationDescription="The selected files will be cleared."
      >
        {(requestClose) => (
          <form onSubmit={uploadAdminFiles} className="space-y-5">
            <FileUploadField
              id="admin-directory-files"
              variant="small"
              label="Files"
              files={uploadFiles}
              onChange={setUploadFiles}
              hint="Any file type is accepted. Review the selected files below before uploading them to the current folder."
              maxFiles={10}
              disabled={uploading}
              onError={(message) => showToast({ message, type: "error" })}
            />
            <ModalActions>
              <Button
                type="button"
                disabled={uploading}
                onClick={requestClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploading || uploadFiles.length === 0}
                variant="default"
              >
                {uploading ? "Uploading..." : "Upload files"}
              </Button>
            </ModalActions>
          </form>
        )}
      </FormModal>

      <FormModal
        open={Boolean(renamingItem)}
        onClose={() => setRenamingItem(null)}
        title="Rename item"
        description={renamingItem?.name}
        width="md"
        fitContent
        showCloseButton={false}
        confirmationDescription="The new name will be discarded."
      >
        {(requestClose) => (
          <form onSubmit={renameItem} className="space-y-5">
            <label>
              <span className={styles.label}>New name</span>
              <Input
                value={renameValue}
                maxLength={180}
                onChange={(event) => setRenameValue(event.target.value)}
                className={styles.input(false, mutating)}
                disabled={mutating}
                autoFocus
                required
              />
            </label>
            <ModalActions>
              <Button
                type="button"
                disabled={mutating}
                onClick={requestClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating || !renameValue.trim()}
                variant="default"
              >
                {mutating ? "Renaming..." : "Rename"}
              </Button>
            </ModalActions>
          </form>
        )}
      </FormModal>

      <FormModal
        open={movingItems.length > 0}
        onClose={() => setMovingItems([])}
        title={
          movingItems.length === 1
            ? "Move item"
            : `Move ${movingItems.length} items`
        }
        description={
          movingItems.length === 1
            ? movingItems[0]?.name
            : "Browse to the destination folder, then choose Move here."
        }
        width="lg"
        fitContent
        showCloseButton={false}
        shouldConfirmClose={false}
      >
        {(requestClose) => (
          <form onSubmit={moveItem} className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {moveBreadcrumbs.length > 0 && (
                <nav
                  aria-label="Destination folder path"
                  className="flex flex-wrap items-center gap-1 border-b border-border bg-data-header px-4 py-3 text-sm"
                >
                  {moveBreadcrumbs.map((crumb, index) => (
                    <div
                      key={crumb.id}
                      className="flex min-w-0 items-center gap-1"
                    >
                      {index > 0 && (
                        <AnimatedChevronRightIcon
                          className="text-primary"
                          size={16}
                          animated={false}
                        />
                      )}
                      <Button
                        type="button"
                        disabled={crumb.id === moveBrowser?.folderId}
                        onClick={() => void loadMoveFolder(crumb.id)}
                        className="truncate rounded-lg px-2 py-1 text-muted-foreground enabled:hover:bg-card enabled:hover:text-muted-foreground disabled:font-semibold disabled:text-foreground"
                      >
                        {crumb.name}
                      </Button>
                    </div>
                  ))}
                </nav>
              )}

              {loadingDestinations ? (
                <LoadingState
                  message="Loading folders..."
                  className="min-h-56"
                />
              ) : moveBrowser ? (
                <div className="max-h-80 overflow-y-auto">
                  <div className="border-b border-border bg-data-header px-4 py-3 text-sm text-foreground">
                    Destination:{" "}
                    <span className="font-semibold">
                      {moveBrowser.breadcrumbs.at(-1)?.name}
                    </span>
                  </div>

                  {moveBrowser.items.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      This folder has no subfolders.
                    </p>
                  ) : (
                    moveBrowser.items.map((item) => (
                      <div
                        key={item.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <Button
                          type="button"
                          onClick={() => void loadMoveFolder(item.id)}
                          className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left hover:bg-data-hover"
                        >
                          <AnimatedFolderIcon
                            className="shrink-0 text-warning"
                            size={21}
                          />
                          <span className="truncate text-sm font-semibold text-foreground">
                            {item.name}
                          </span>
                          <AnimatedChevronRightIcon
                            className="ml-auto shrink-0 text-primary"
                            size={16}
                            animated={false}
                          />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <ModalActions>
              <Button
                type="button"
                disabled={mutating}
                onClick={requestClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutating || loadingDestinations || !moveBrowser}
                variant="default"
              >
                {mutating ? "Moving..." : "Move here"}
              </Button>
            </ModalActions>
          </form>
        )}
      </FormModal>

      <FormModal
        open={showNewFolder}
        onClose={() => {
          setShowNewFolder(false);
          setNewFolderName("");
        }}
        title="New folder"
        description={`Enter a name for the new folder. It will be created inside “${folder?.breadcrumbs.at(-1)?.name ?? "Admin Files"}” and will become available here and in Google Drive.`}
        width="sm"
        fitContent
        showCloseButton={false}
        shouldConfirmClose={false}
      >
        {(requestClose) => (
          <form onSubmit={createFolder} className="space-y-5">
            <label className="block">
              <span className={styles.label}>Folder name *</span>
              <Input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                placeholder="Folder name"
                maxLength={180}
                className={styles.input(false, creatingFolder)}
                disabled={creatingFolder}
                autoFocus
                required
              />
            </label>
            <ModalActions>
              <Button
                type="button"
                disabled={creatingFolder}
                onClick={requestClose}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingFolder || !newFolderName.trim()}
                variant="default"
              >
                {creatingFolder ? "Creating..." : "Create folder"}
              </Button>
            </ModalActions>
          </form>
        )}
      </FormModal>

      <Modal
        open={showSyncInfo}
        onClose={() => setShowSyncInfo(false)}
        title="About Drive synchronization"
        width="sm"
      >
        <div className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            To ensure real-time updates, edit files using this browser. If you
            make changes directly in Google Drive, sync it to update the tracer
            system.
          </p>
          <ModalActions>
            <Button
              type="button"
              variant="default"
              disabled={preparing}
              onClick={() => void prepareFolders()}
              className="whitespace-nowrap disabled:cursor-wait disabled:opacity-60"
            >
              <AnimatedFolderSettingsIcon
                className={preparing ? "animate-spin" : ""}
                size={17}
                animated={!preparing}
              />
              {preparing ? "Syncing Drive..." : "Sync Drive"}
            </Button>
          </ModalActions>
        </div>
      </Modal>

      <Modal
        open={Boolean(infoItem)}
        onClose={() => setInfoItem(null)}
        title={infoItem?.name ?? "Item information"}
        width="sm"
      >
        {infoItem && (
          <dl className="divide-y divide-border text-sm">
            <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3 first:pt-0">
              <dt className="font-medium text-muted-foreground">File type</dt>
              <dd className="wrap-break-word text-foreground">
                {formatFileType(infoItem)}
              </dd>
            </div>
            <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="font-medium text-muted-foreground">Size</dt>
              <dd className="text-foreground">
                {infoItem.isFolder ? "" : formatSize(infoItem.size)}
              </dd>
            </div>
            <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="font-medium text-muted-foreground">Modified</dt>
              <dd className="text-foreground">
                {infoItem.modifiedTime
                  ? new Date(infoItem.modifiedTime).toLocaleString("en-PH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-3 last:pb-0">
              <dt className="font-medium text-muted-foreground">MIME type</dt>
              <dd className="break-all text-foreground">{infoItem.mimeType}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmationDialog
        open={deletingItems.length > 0}
        onClose={() => setDeletingItems([])}
        onConfirm={() => void deleteItem()}
        title={
          deletingItems.length === 1
            ? `Delete ${deletingItems[0]?.name ?? "item"}?`
            : `Delete ${deletingItems.length} items?`
        }
        description={
          deletingItems.length > 1
            ? "This permanently deletes the selected files and folders, including everything inside selected folders."
            : deletingItems[0]?.isFolder
              ? "This permanently deletes the folder and everything inside it from Admin Files."
              : "This permanently deletes the file from Admin Files."
        }
        cancelLabel="Keep item"
        confirmLabel="Delete permanently"
        tone="danger"
        busy={mutating}
      />

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "File preview"}
        description={
          preview
            ? `${preview.mimeType} · ${formatSize(preview.size)}`
            : undefined
        }
        width="xl"
        bodyClassName="flex min-h-0 flex-col bg-secondary p-3 md:p-4"
      >
        {preview && (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            {canPreviewInBrowser(preview.mimeType) ? (
              <iframe
                title={`Preview ${preview.name}`}
                src={`/api/admin/files/${encodeURIComponent(preview.id)}/content`}
                className="min-h-96 w-full flex-1 rounded-xl border border-border bg-card"
              />
            ) : (
              <div className="flex min-h-96 flex-1 flex-col items-center justify-center rounded-xl border border-border bg-card p-8 text-center">
                <AnimatedFileTextIcon
                  size={40}
                  animated={false}
                  className="text-primary"
                />
                <p className="mt-4 font-semibold text-foreground">
                  This format cannot be previewed securely in the browser.
                </p>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  The file remains private and is not being shared through a
                  Google Drive link.
                </p>
              </div>
            )}

            <ModalActions>
              <Button
                variant="default"
                render={
                  <a
                    href={`/api/admin/files/${encodeURIComponent(preview.id)}/content`}
                    target="_blank"
                    rel="noreferrer"
                  />
                }
              >
                <AnimatedExternalLinkIcon size={16} /> Open in new tab
              </Button>
            </ModalActions>
          </div>
        )}
      </Modal>
    </div>
  );
}
