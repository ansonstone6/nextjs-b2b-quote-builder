import { getMondayConfig } from "./config";

type GraphQLError = { message: string; extensions?: unknown };

class MondayError extends Error {
  constructor(message: string, public readonly errors?: GraphQLError[]) {
    super(message);
  }
}

async function graphql<T>(token: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const cfg = getMondayConfig();
  const res = await fetch(cfg.graphqlUrl, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as {
    data?: T;
    errors?: GraphQLError[];
    error_message?: string;
  };
  if (!res.ok || body.errors) {
    const msg =
      body.errors?.map((e) => e.message).join("; ") ??
      body.error_message ??
      `Monday API error (${res.status})`;
    throw new MondayError(msg, body.errors);
  }
  if (!body.data) {
    throw new MondayError("Monday API returned no data");
  }
  return body.data;
}

// --- Operations -----------------------------------------------------------

export type MondayMe = {
  id: string;
  name: string;
  email: string;
  account: { id: string; name: string; slug: string };
};

export async function getMe(token: string): Promise<MondayMe> {
  const data = await graphql<{ me: MondayMe }>(
    token,
    `query { me { id name email account { id name slug } } }`,
  );
  return data.me;
}

export type MondayBoardSummary = {
  id: string;
  name: string;
  state: string;
  itemsCount?: number | null;
};

export async function listBoards(token: string, limit = 50): Promise<MondayBoardSummary[]> {
  const data = await graphql<{ boards: MondayBoardSummary[] }>(
    token,
    `query ($limit: Int!) {
      boards (limit: $limit, order_by: used_at) {
        id
        name
        state
      }
    }`,
    { limit },
  );
  return data.boards.filter((b) => b.state === "active");
}

export type MondayItem = {
  id: string;
  name: string;
};

/**
 * Create a board item. `columnValues` is the JSON-encoded shape Monday expects
 * (status keys → label, text keys → string, date keys → { date: 'YYYY-MM-DD' }).
 * We accept it as an object and stringify here.
 */
export async function createItem(
  token: string,
  args: {
    boardId: string;
    itemName: string;
    columnValues?: Record<string, unknown>;
  },
): Promise<MondayItem> {
  const data = await graphql<{ create_item: MondayItem }>(
    token,
    `mutation ($board: ID!, $name: String!, $vals: JSON) {
      create_item (board_id: $board, item_name: $name, column_values: $vals) {
        id
        name
      }
    }`,
    {
      board: args.boardId,
      name: args.itemName,
      vals: args.columnValues ? JSON.stringify(args.columnValues) : null,
    },
  );
  return data.create_item;
}

/**
 * Upload a file to a Files-type column on an item.
 *
 * Monday's file endpoint (https://api.monday.com/v2/file) uses a non-standard
 * multipart shape — NOT the graphql-multipart-request-spec. The query field
 * carries the mutation with the item/column ids inlined, and the file goes
 * into a form field named `variables[file]`. Trying to use `operations` / `map`
 * (the Apollo / graphql-multipart spec) gets rejected with "Unsupported query".
 *
 * Reference: https://developer.monday.com/api-reference/docs/upload-files
 */
export async function addFileToColumn(
  token: string,
  args: { itemId: string; columnId: string; filename: string; bytes: Uint8Array; mimeType: string },
): Promise<{ id: string } | null> {
  const cfg = getMondayConfig();
  const query = `mutation add_file($file: File!) {
    add_file_to_column (item_id: ${args.itemId}, column_id: "${args.columnId}", file: $file) {
      id
    }
  }`;
  const form = new FormData();
  form.append("query", query);
  form.append(
    "variables[file]",
    new Blob([args.bytes as BlobPart], { type: args.mimeType }),
    args.filename,
  );

  const res = await fetch(cfg.fileUrl, {
    method: "POST",
    headers: {
      Authorization: token,
      "API-Version": "2024-10",
    },
    body: form,
  });
  const body = (await res.json()) as {
    data?: { add_file_to_column?: { id: string } | null };
    errors?: GraphQLError[];
    error_message?: string;
  };
  if (!res.ok || body.errors) {
    throw new MondayError(
      body.errors?.map((e) => e.message).join("; ") ??
        body.error_message ??
        `Monday file upload failed (${res.status})`,
      body.errors,
    );
  }
  return body.data?.add_file_to_column ?? null;
}

export type BoardColumn = {
  id: string;
  title: string;
  type: string;
};

export async function getBoardColumns(token: string, boardId: string): Promise<BoardColumn[]> {
  const data = await graphql<{ boards: Array<{ columns: BoardColumn[] }> }>(
    token,
    `query ($id: [ID!]) {
      boards (ids: $id) {
        columns { id title type }
      }
    }`,
    { id: [boardId] },
  );
  return data.boards[0]?.columns ?? [];
}

export { MondayError };
