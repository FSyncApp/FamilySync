import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  LayoutChangeEvent,
  PanResponder,
  Dimensions,
  Platform,
} from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

/**
 * Circular crop overlay editor (Phase 2.1):
 * - Shows a circular guide (no dimming)
 * - Single-finger drag to position (must not dismiss modal)
 * - Two-finger pinch to zoom (works together with drag via centroid delta)
 * - Zoom via +/- buttons (kept in sync with pinch scale)
 * - Crops a square output that will be displayed as a circle elsewhere
 *
 * IMPORTANT: iOS Photo Library can return "ph://..." URIs, which RN <Image> can't render.
 * We "materialize" those into a file:// URI using ImageManipulator with a no-op operation.
 */

export type CircularCropperModalProps = {
  visible: boolean;
  uri: string | null;
  title?: string;
  onCancel: () => void;
  onDone: (resultUri: string) => void;
};

type ImgSize = { w: number; h: number };

function isPhUri(u: string) {
  return u.startsWith("ph://") || u.startsWith("assets-library://");
}

async function materializeUri(inputUri: string): Promise<string> {
  if (!isPhUri(inputUri)) return inputUri;
  const out = await ImageManipulator.manipulateAsync(inputUri, [], {
    compress: 1,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return out.uri || inputUri;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export default function CircularCropperModal({
  visible,
  uri,
  title = "Position your photo",
  onCancel,
  onDone,
}: CircularCropperModalProps) {
  const win = Dimensions.get("window");

  const [frame, setFrame] = useState<number | null>(null);
  const [imgSize, setImgSize] = useState<ImgSize | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);

  const [userScale, setUserScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const startTx = useRef(0);
  const startTy = useRef(0);
  const startScale = useRef(1);

  const pinchStartDist = useRef<number | null>(null);
  const pinchStartMid = useRef<{ x: number; y: number } | null>(null);
  const lastTouchCount = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!uri || !visible) {
        setSourceUri(null);
        return;
      }
      try {
        const out = await materializeUri(uri);
        if (!cancelled) setSourceUri(out);
      } catch {
        if (!cancelled) setSourceUri(uri);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [uri, visible]);

  useEffect(() => {
    if (!sourceUri) return;
    Image.getSize(
      sourceUri,
      (w, h) => setImgSize({ w, h }),
      () => setImgSize(null)
    );
  }, [sourceUri]);

  const guideSize = useMemo(() => {
    const raw = Math.min(win.width, win.height) - 140;
    if (!frame) return Math.max(180, raw);
    return Math.max(180, Math.min(frame, raw));
  }, [win.width, win.height, frame]);

  const D = guideSize;

  const baseScale = useMemo(() => {
    if (!imgSize) return 1;
    return Math.max(D / imgSize.w, D / imgSize.h);
  }, [imgSize, D]);

  const effectiveScale = baseScale * userScale;
  const ready = !!visible && !!sourceUri && !!imgSize && !!frame && frame > 0;

  useEffect(() => {
    if (!visible) return;
    lastTouchCount.current = 0;
    pinchStartDist.current = null;
    pinchStartMid.current = null;
    startTx.current = 0;
    startTy.current = 0;
    startScale.current = 1;
    setTx(0);
    setTy(0);
    setUserScale(1);
  }, [visible, sourceUri]);

  const clampTranslation = (nextTx: number, nextTy: number, scaleOverride?: number) => {
    if (!imgSize) return { x: nextTx, y: nextTy };

    const scale = scaleOverride ?? effectiveScale;
    const scaledW = imgSize.w * scale;
    const scaledH = imgSize.h * scale;

    const maxX = Math.max(0, (scaledW - D) / 2);
    const maxY = Math.max(0, (scaledH - D) / 2);

    return {
      x: clamp(nextTx, -maxX, maxX),
      y: clamp(nextTy, -maxY, maxY),
    };
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,

        onPanResponderGrant: (evt) => {
          startTx.current = tx;
          startTy.current = ty;
          startScale.current = userScale;

          const touches = evt.nativeEvent.touches ?? [];
          lastTouchCount.current = touches.length;

          if (touches.length >= 2) {
            const a = { x: touches[0].pageX, y: touches[0].pageY };
            const b = { x: touches[1].pageX, y: touches[1].pageY };
            pinchStartDist.current = distance(a, b);
            pinchStartMid.current = midpoint(a, b);
          } else {
            pinchStartDist.current = null;
            pinchStartMid.current = null;
          }
        },

        onPanResponderMove: (evt, gesture) => {
          if (!ready) return;

          const touches = evt.nativeEvent.touches ?? [];
          const touchCount = touches.length;

          if (touchCount !== lastTouchCount.current) {
            startTx.current = tx;
            startTy.current = ty;
            startScale.current = userScale;

            if (touchCount >= 2) {
              const a = { x: touches[0].pageX, y: touches[0].pageY };
              const b = { x: touches[1].pageX, y: touches[1].pageY };
              pinchStartDist.current = distance(a, b);
              pinchStartMid.current = midpoint(a, b);
            } else {
              pinchStartDist.current = null;
              pinchStartMid.current = null;
            }

            lastTouchCount.current = touchCount;
          }

          if (touchCount >= 2) {
            const a = { x: touches[0].pageX, y: touches[0].pageY };
            const b = { x: touches[1].pageX, y: touches[1].pageY };
            const d = distance(a, b);
            const mid = midpoint(a, b);

            const startD = pinchStartDist.current ?? d;
            const startM = pinchStartMid.current ?? mid;

            const rawScale = startScale.current * (d / Math.max(1, startD));
            const nextUserScale = clamp(rawScale, 1, 3);

            const dx = mid.x - startM.x;
            const dy = mid.y - startM.y;

            const nextEffectiveScale = baseScale * nextUserScale;
            const next = clampTranslation(startTx.current + dx, startTy.current + dy, nextEffectiveScale);

            setUserScale(nextUserScale);
            setTx(next.x);
            setTy(next.y);
            return;
          }

          const next = clampTranslation(startTx.current + gesture.dx, startTy.current + gesture.dy);
          setTx(next.x);
          setTy(next.y);
        },

        onPanResponderRelease: () => {
          const next = clampTranslation(tx, ty);
          setTx(next.x);
          setTy(next.y);

          pinchStartDist.current = null;
          pinchStartMid.current = null;
          lastTouchCount.current = 0;
        },

        onPanResponderTerminate: () => {
          pinchStartDist.current = null;
          pinchStartMid.current = null;
          lastTouchCount.current = 0;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, tx, ty, userScale, imgSize, baseScale, effectiveScale, D]
  );

  const onLayoutFrame = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (!w) return;
    if (!frame || Math.abs(w - frame) > 2) setFrame(w);
  };

  const zoomBy = (delta: number) => {
    const nextUserScale = clamp(+(userScale + delta).toFixed(2), 1, 3);
    const nextEffectiveScale = baseScale * nextUserScale;
    const next = clampTranslation(tx, ty, nextEffectiveScale);

    setUserScale(nextUserScale);
    setTx(next.x);
    setTy(next.y);
  };

  const handleDone = async () => {
    if (!sourceUri || !imgSize || !frame) return;

    const cropSize = frame / effectiveScale;

    const originX = imgSize.w / 2 - cropSize / 2 - tx / effectiveScale;
    const originY = imgSize.h / 2 - cropSize / 2 - ty / effectiveScale;

    const safe = {
      originX: Math.max(0, Math.min(imgSize.w - cropSize, originX)),
      originY: Math.max(0, Math.min(imgSize.h - cropSize, originY)),
      width: Math.min(imgSize.w, cropSize),
      height: Math.min(imgSize.h, cropSize),
    };

    try {
      const result = await ImageManipulator.manipulateAsync(sourceUri, [{ crop: safe }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      onDone(result.uri);
    } catch {
      onDone(sourceUri);
    }
  };

  const topPad = Platform.OS === "ios" ? 14 : 10;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : "fullScreen"}
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={onCancel} hitSlop={12}>
            <Text style={styles.headerLink}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{title}</Text>

          <TouchableOpacity onPress={handleDone} hitSlop={12}>
            <Text style={styles.headerLink}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.frameWrap} onLayout={onLayoutFrame}>
            <View style={styles.frame} {...panResponder.panHandlers}>
              {ready && imgSize && (
                <Image
                  source={{ uri: sourceUri! }}
                  style={[
                    styles.image,
                    {
                      width: imgSize.w,
                      height: imgSize.h,
                      left: "50%",
                      top: "50%",
                      marginLeft: -imgSize.w / 2,
                      marginTop: -imgSize.h / 2,
                      transform: [{ scale: effectiveScale }, { translateX: tx }, { translateY: ty }],
                    },
                  ]}
                  resizeMode="cover"
                />
              )}
            </View>

            <View pointerEvents="none" style={styles.circleGuideWrap}>
              <View style={[styles.circleGuide, { width: D, height: D, borderRadius: D / 2 }]} />
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(-0.1)} hitSlop={10}>
              <Text style={styles.zoomBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>Zoom</Text>
            <TouchableOpacity style={styles.zoomBtn} onPress={() => zoomBy(0.1)} hitSlop={10}>
              <Text style={styles.zoomBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>Drag to position. Pinch to zoom, or use + / −.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  headerLink: { fontSize: 16, fontWeight: "900", color: "#111827" },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 14, alignItems: "center" },

  frameWrap: { width: "100%", alignItems: "center" },
  frame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "#0B1220",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { position: "absolute" },

  circleGuideWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  circleGuide: { borderWidth: 3, borderColor: "rgba(255,255,255,0.95)" },

  controls: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 16 },
  zoomBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnText: { fontSize: 28, fontWeight: "900", color: "#111827", marginTop: -2 },
  zoomLabel: { fontSize: 20, fontWeight: "900", color: "#111827" },
  hint: { marginTop: 10, fontSize: 14, color: "#6B7280", fontWeight: "700" },
});
