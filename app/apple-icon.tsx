import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon (iOS): the Flami flame on green. */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#16a05d",
      }}
    >
      <svg viewBox="0 0 32 32" width={120} height={120}>
        <path
          fill="#fff"
          d="M16 2.5c1.6 3.6 6.9 6.8 8.9 11.4 2.6 6-1.4 13.6-8.9 13.6-1.9 0-3.6-.4-5.1-1.2L5.5 28l1.3-5.1C5.6 21 5 18.9 5.3 16.6 6 11.4 10.8 9.7 12.4 5.3c.9 2.3 1 4 .6 5.9 1.9-1.6 3-4.8 3-8.7Z"
        />
        <path
          fill="#16a05d"
          d="M16.3 15.2c.9 1.8 3.3 3 3.3 5.4a3.6 3.6 0 0 1-7.2.2c0-1.6 1-2.4 1.7-3.3.4.8.5 1.4.4 2 1-.8 1.8-2.3 1.8-4.3Z"
        />
      </svg>
    </div>,
    size,
  );
}
