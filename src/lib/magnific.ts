const BASE_URL = "https://api.magnific.com/v1";

function headers() {
  const key = process.env.MAGNIFIC_API_KEY;
  if (!key) throw new Error("MAGNIFIC_API_KEY not set in environment");
  return {
    "Content-Type": "application/json",
    "x-magnific-api-key": key,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface TaskResult {
  task_id: string;
  status: TaskStatus;
  generated?: string[];
  error?: string;
}

export type Resolution = "1k" | "2k" | "4k";
export type AspectRatio =
  | "square_1_1" | "classic_4_3" | "traditional_3_4"
  | "widescreen_16_9" | "social_story_9_16" | "standard_3_2"
  | "portrait_2_3" | "horizontal_2_1" | "vertical_1_2";

export type MysticModel =
  | "realism" | "fluid" | "zen" | "flexible" | "super_real" | "editorial_portraits";

export type ScaleFactor = "2x" | "4x" | "8x" | "16x";
export type UpscaleEngine =
  | "magnific_sparkle" | "magnific_illusio" | "magnific_sharpy";

// ─── Core ─────────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Magnific ${res.status}: ${text}`);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Magnific ${res.status}: ${text}`);
  }
  return res.json();
}

// ─── Poll until done ──────────────────────────────────────────────────────────

export async function pollTask(
  taskId: string,
  intervalMs = 2000,
  maxWaitMs = 120_000,
): Promise<TaskResult> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const { data } = await get<{ data: TaskResult }>(`/tasks/${taskId}`);
    if (data.status === "COMPLETED" || data.status === "FAILED") return data;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Task ${taskId} timed out after ${maxWaitMs}ms`);
}

// ─── Image Generation (Mystic) ────────────────────────────────────────────────

export async function generateImage(params: {
  prompt: string;
  model?: MysticModel;
  resolution?: Resolution;
  aspect_ratio?: AspectRatio;
  creative_detailing?: number;
  webhook_url?: string;
}): Promise<TaskResult> {
  const { data } = await post<{ data: TaskResult }>("/ai/mystic", {
    model: "realism",
    resolution: "2k",
    aspect_ratio: "square_1_1",
    ...params,
  });
  return data;
}

// ─── Image Upscaler ───────────────────────────────────────────────────────────

export async function upscaleImage(params: {
  image: string; // base64
  scale_factor?: ScaleFactor;
  prompt?: string;
  creativity?: number;
  hdr?: number;
  resemblance?: number;
  engine?: UpscaleEngine;
  webhook_url?: string;
}): Promise<TaskResult> {
  const { data } = await post<{ data: TaskResult }>("/ai/image-upscaler", {
    scale_factor: "2x",
    engine: "magnific_sparkle",
    creativity: 2,
    hdr: 1,
    resemblance: 1,
    ...params,
  });
  return data;
}

// ─── Remove Background ────────────────────────────────────────────────────────

export async function removeBackground(params: {
  image: string; // base64
  webhook_url?: string;
}): Promise<TaskResult> {
  const { data } = await post<{ data: TaskResult }>("/ai/remove-background", params);
  return data;
}

// ─── Icon Generation ──────────────────────────────────────────────────────────

export async function generateIcon(params: {
  prompt: string;
  style?: string;
  webhook_url?: string;
}): Promise<TaskResult> {
  const { data } = await post<{ data: TaskResult }>("/ai/icons", params);
  return data;
}

// ─── Stock Search ─────────────────────────────────────────────────────────────

export async function searchStock(params: {
  query: string;
  type?: "photo" | "illustration" | "vector" | "icon";
  limit?: number;
}): Promise<{ items: { id: string; url: string; thumbnail: string }[] }> {
  const qs = new URLSearchParams({
    query: params.query,
    ...(params.type && { type: params.type }),
    ...(params.limit && { limit: String(params.limit) }),
  });
  return get(`/resources/search?${qs}`);
}

// ─── Get task status ──────────────────────────────────────────────────────────

export async function getTask(taskId: string): Promise<TaskResult> {
  const { data } = await get<{ data: TaskResult }>(`/tasks/${taskId}`);
  return data;
}
