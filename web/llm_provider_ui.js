// Visibility never removes/reorders widgets: old positional workflows stay valid.
const SAVED = new WeakMap();
export const INTEGRATED = "In ComfyUI (GGUF)";
export const LOCAL = "Local app / server";
export const CLOUD = "Cloud service";
export const CONNECTION_FIELDS = ["backend", "local_provider", "cloud_provider", "server_url", "api_key_env", "credential_id"];
export const REMOTE_FIELDS = ["server_url", "remote_model", "api_key_env", "credential_id", "remote_max_tokens", "request_timeout",
    // Belongs to the connection, not to a single request: it decides what happens to
    // this connection's key. Hidden with the other remote fields for the same reason.
    "permanent_key"];

/**
 * Nodes that carry the same provider widgets: the chat node and the central
 * settings node (``MiniMaxLLMSettings``, which holds the provider, model and
 * sampler values for every call). Both get the same labels, the same visibility
 * rules and the same buttons; ``llm_provider.js`` only wires that to the canvas.
 * Kept here as data so the frontend test can require both node types - a new
 * node that is missing from this set silently loses its provider UI.
 */
export const PROVIDER_NODES = new Set(["MiniMaxLLMChat", "MiniMaxLLMSettings"]);
const BASIC = new Set(["enabled", "model", "max_tokens", "temperature", "n_ctx", "auto_download"]);

/**
 * Marks for the GGUF dropdown: the list holds installed files *and* catalog
 * candidates (a candidate downloads on first use), so it has to say which is which.
 *
 * The mark lives in the option *label* only. The widget value stays the bare file
 * name, so a saved workflow keeps resolving after that file has been downloaded -
 * and ``getOptionLabel`` is what ComfyUI 1.52 uses for both the displayed value and
 * the dropdown entries, so no value is ever rewritten.
 */
export const INSTALLED_MARK = "\u2714";
export const DOWNLOAD_MARK = "\u2B07";

/** The label for one GGUF entry; an unknown name is shown unchanged, not guessed at. */
export function modelOptionLabel(value, info) {
    if (typeof value !== "string" || !value || !info) return value;
    if (info.installed) return `${INSTALLED_MARK} ${value}`;
    const details = [];
    const gib = Number(info.gib);
    if (Number.isFinite(gib) && gib > 0) details.push(`${gib.toFixed(1)} GiB`);
    if (info.stars) details.push(info.stars);
    return `${DOWNLOAD_MARK} ${value}${details.length ? " \u00B7 " + details.join(" \u00B7 ") : ""}`;
}

/** One line for the model widget's label, e.g. ``Model - 3 installed, 16 to download``. */
export function modelInventorySummary(listing) {
    const entries = Array.isArray(listing?.entries) ? listing.entries : [];
    if (!entries.length) return "";
    const installed = entries.filter(entry => entry.installed).length;
    return `Model - ${installed} installed, ${entries.length - installed} to download`;
}

/** The hover text that explains the two marks, including where the files belong. */
export function modelInventoryTooltip(listing) {
    const folder = typeof listing?.folder === "string" && listing.folder ? listing.folder : "models/llm";
    return `${INSTALLED_MARK} is already in your ${folder} folder. ${DOWNLOAD_MARK} is not downloaded yet; `
        + "the size and the suitability rating are shown, and the first use of that model fetches it.";
}

/**
 * The node's action buttons, with the help text that must be attached to each.
 *
 * Kept as data so the frontend test can require that no button ships without a
 * tooltip; ``llm_provider.js`` only reads it and adds the widgets.
 */
export const BUTTONS = {
    llm_ui_advanced: {
        label: "Show / hide advanced GGUF settings",
        tooltip: "Shows the loaded model's sampler defaults and its tensor split / main GPU controls. These are advanced GGUF settings; the workflow defaults work for a single GPU.",
    },
    llm_ui_key: {
        label: "Set API key…",
        tooltip: "Enters a provider key without putting it in the workflow. It stays in ComfyUI's memory for this session, or is stored on this computer when 'Keep API key after restart' is on. Cloud requests are billed by the provider.",
    },
    llm_ui_clear: {
        label: "Clear session key",
        tooltip: "Forgets the key entered for this connection, including the copy stored with 'Keep API key after restart'. Runs then fall back to the environment variable named in 'API key variable', if one is set.",
    },
    llm_ui_models: {
        label: "Find models / test connection…",
        tooltip: "Asks the configured server or provider for its model list and copies the selected ID into the model field. This also tests the connection; no generation request is sent and no charge is incurred.",
    },
    llm_ui_help: {
        label: "Connection setup / status…",
        tooltip: "Shows the resolved API address, where the key comes from and the setup steps for the selected provider. Use it when a request fails with an address or authentication error.",
    },
};

export function widget(node, name) { return node.widgets?.find(w => w.name === name); }
export function settings(node) {
    return Object.fromEntries(CONNECTION_FIELDS.map(name => [name, widget(node, name)?.value ?? ""]));
}
export function signature(node) { return JSON.stringify(settings(node)); }

export function visible(name, backend, advanced = false) {
    if (name === "credential_id") return false;
    if (name === "backend" || name === "enabled") return true;
    if (name === "local_provider") return backend === LOCAL;
    if (name === "cloud_provider") return backend === CLOUD;
    if (name.startsWith("llm_ui_")) return name === "llm_ui_advanced" ? backend === INTEGRATED : backend !== INTEGRATED;
    if (REMOTE_FIELDS.includes(name)) return backend !== INTEGRATED;
    return backend === INTEGRATED && (advanced || BASIC.has(name));
}

export function setVisible(w, show) {
    if (!SAVED.has(w)) SAVED.set(w, {type: w.type, computeSize: w.computeSize, draw: w.draw});
    const original = SAVED.get(w);
    if (show) Object.assign(w, original);
    else {
        w.type = "minimax_hidden";
        w.computeSize = () => [0, -4];
        w.draw = () => {};
    }
    if (w.inputEl) w.inputEl.hidden = !show;
}

export function refresh(node) {
    const backend = widget(node, "backend")?.value || INTEGRATED;
    for (const w of node.widgets || []) setVisible(w, visible(w.name, backend, !!node._llmAdvanced));
    const size = node.computeSize?.();
    if (size) node.setSize?.([Math.max(node.size?.[0] || 360, size[0]), size[1]]);
    node.setDirtyCanvas?.(true, true);
}
