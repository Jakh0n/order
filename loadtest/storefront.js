// k6 load test: simulates customers browsing a store.
//
//   brew install k6
//   BASE_URL=https://your-preview.vercel.app SLUG=flami-grill npm run loadtest
//   (optional) ORDER_ID=<id of a test order> — also loads the order status page
//
// Run it against a preview/staging deployment, not production, and not against localhost
// (from your laptop you'd mostly measure the distance to the database).
import { check, sleep } from "k6";
import http from "k6/http";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SLUG = __ENV.SLUG || "flami-grill";
const ORDER_ID = __ENV.ORDER_ID || "";

export const options = {
  scenarios: {
    customers: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 }, // warm up
        { duration: "1m", target: 100 }, // normal lunch rush
        { duration: "1m", target: 200 }, // peak
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // < 1% errors
    "http_req_duration{page:menu}": ["p(95)<500"], // menu is cached — should be fast
    "http_req_duration{page:checkout}": ["p(95)<800"],
    "http_req_duration{page:order}": ["p(95)<800"],
    "http_req_duration{page:health}": ["p(95)<500"],
  },
};

export default function browseStore() {
  const menu = http.get(`${BASE_URL}/${SLUG}`, { tags: { page: "menu" } });
  check(menu, { "menu 200": (r) => r.status === 200 });
  sleep(Math.random() * 3 + 2); // browsing the menu

  const checkout = http.get(`${BASE_URL}/${SLUG}/checkout`, { tags: { page: "checkout" } });
  check(checkout, { "checkout 200": (r) => r.status === 200 });
  sleep(Math.random() * 2 + 1);

  if (ORDER_ID) {
    const order = http.get(`${BASE_URL}/o/${ORDER_ID}`, { tags: { page: "order" } });
    check(order, { "order 200": (r) => r.status === 200 });
  }

  // ~1 in 20 iterations, like an uptime monitor
  if (Math.random() < 0.05) {
    const health = http.get(`${BASE_URL}/api/health`, { tags: { page: "health" } });
    check(health, { "health 200": (r) => r.status === 200 });
  }
  sleep(1);
}
