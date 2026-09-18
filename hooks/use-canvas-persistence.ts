"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { saveCanvasSnapshot } from "@/lib/canvas/api";

const SAVE_DEBOUNCE = 300;
const KEEPALIVE_MAX_BYTES = 60_000;

type SaveStatus = "idle" | "saving" | "error";

type SceneSnapshot = {
  canvasId: string;
  version: number;
  elements: readonly unknown[];
  appState: object;
  files: object;
};

type SerializeAsJSON = (
  elements: never,
  appState: never,
  files: never,
  source: "local",
) => string;

let serializerPromise: Promise<SerializeAsJSON> | null = null;

function loadSerializer(): Promise<SerializeAsJSON> {
  if (!serializerPromise) {
    serializerPromise = import("@excalidraw/excalidraw").then(
      (module) =>
        module.serializeAsJSON as unknown as SerializeAsJSON,
    );
  }

  return serializerPromise;
}

export function useCanvasPersistence(
  activeId: string | null,
) {
  const [status, setStatus] =
    useState<SaveStatus>("idle");

  const timerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const latestSceneRef =
    useRef<SceneSnapshot | null>(null);

  const versionRef = useRef(0);

  /**
   * Save queue prevents this:
   *
   * save A -----------> DB
   * save B ---> DB
   *
   * followed by save A finishing later and overwriting B.
   */
  const saveQueueRef = useRef<Promise<void>>(
    Promise.resolve(),
  );

  const serializerRef =
    useRef<SerializeAsJSON | null>(null);

  /**
   * Track successfully persisted versions per canvas.
   */
  const savedVersionsRef = useRef(
    new Map<string, number>(),
  );

  /**
   * Preload the serializer.
   *
   * This is important because when the user navigates away we
   * don't want the final save to first wait for a dynamic import.
   */
  useEffect(() => {
    let cancelled = false;

    void loadSerializer().then((serializer) => {
      if (!cancelled) {
        serializerRef.current = serializer;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (
      scene: SceneSnapshot,
      keepalive = false,
    ) => {
      const alreadySaved =
        savedVersionsRef.current.get(scene.canvasId) ?? 0;

      if (scene.version <= alreadySaved) {
        return;
      }

      let serializer = serializerRef.current;

      if (!serializer) {
        serializer = await loadSerializer();
        serializerRef.current = serializer;
      }

      const body = serializer(
        scene.elements as never,
        scene.appState as never,
        scene.files as never,
        "local",
      );

      /**
       * Browser keepalive requests have a small payload limit.
       *
       * This is only the emergency pagehide save.
       * Normal autosave happens every 300 ms.
       */
      if (
        keepalive &&
        new Blob([body]).size > KEEPALIVE_MAX_BYTES
      ) {
        return;
      }

      setStatus("saving");

      const runSave = async () => {
        try {
          await saveCanvasSnapshot(
            scene.canvasId,
            body,
            keepalive,
          );

          savedVersionsRef.current.set(
            scene.canvasId,
            scene.version,
          );

          const latest = latestSceneRef.current;

          /**
           * Only show "Saved" if nothing newer appeared while
           * this request was running.
           */
          if (
            latest &&
            latest.canvasId === scene.canvasId &&
            latest.version === scene.version
          ) {
            setStatus("idle");
          }
        } catch (error) {
          console.error(
            "Failed to save canvas:",
            error,
          );

          setStatus("error");
        }
      };

      saveQueueRef.current = saveQueueRef.current
        .catch(() => {
          /**
           * Keep the queue alive even if an earlier request failed.
           */
        })
        .then(runSave);

      await saveQueueRef.current;
    },
    [],
  );

  const flush = useCallback(
    async (keepalive = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const scene = latestSceneRef.current;

      if (!scene) {
        return;
      }

      await persist(scene, keepalive);
    },
    [persist],
  );

  const onChange = useCallback(
    (
      elements: readonly unknown[],
      appState: object,
      files: object,
    ) => {
      if (!activeId) {
        return;
      }

      const version = ++versionRef.current;

      latestSceneRef.current = {
        canvasId: activeId,
        version,
        elements,
        appState,
        files,
      };

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        void flush();
      }, SAVE_DEBOUNCE);
    },
    [activeId, flush],
  );

  /**
   * Save when the page becomes hidden.
   *
   * visibilitychange normally happens before pagehide, giving
   * the regular fetch a better chance to finish.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flush();
      }
    };

    const handlePageHide = () => {
      void flush(true);
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "pagehide",
      handlePageHide,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "pagehide",
        handlePageHide,
      );

      /**
       * Next.js client-side navigation.
       */
      void flush();
    };
  }, [flush]);

  /**
   * Called when deliberately switching sheets.
   */
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    latestSceneRef.current = null;
  }, []);

  /**
   * Used when deleting the currently active canvas.
   * We explicitly DON'T want the pending snapshot to save after
   * the canvas was deleted.
   */
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    latestSceneRef.current = null;

    setStatus("idle");
  }, []);

  return {
    status,
    onChange,
    flush,
    reset,
    cancel,
  };
}
