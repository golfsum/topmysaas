import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        gap: 5,
        padding: 11,
        background: "#0e1114",
        borderRadius: 14,
      }}
    >
      {[14, 22, 31, 42].map((height) => (
        <div
          key={height}
          style={{
            width: 7,
            height,
            borderRadius: 3,
            background: "#67e85f",
          }}
        />
      ))}
    </div>,
    size,
  );
}
