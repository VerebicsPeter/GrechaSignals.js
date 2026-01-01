// TODO: maybe add an immediate opt for watch at least for internals

const PRIMITIVE_TYPES = ["string", "number", "boolean"];

const SYM_CLEANUP = Symbol("cleanup");
const LOG_CLEANUP = true;

/**
 * @typedef {() => void} Unwatcher
 * @typedef {() => void} Refresher
 */
/**
 * @template T
 * @typedef {[
 *   () => T,
 *   (v: T) => void,
 *   (watcher: (v: T) => void) => Unwatcher,
 *   (watcher: (v: T) => void) => void,
 *   Refresher
 * ] & {
 *   __stateobject: true
 * }} StateObject
 */

/**
 * @template T
 * @param {T} initial
 * @returns {StateObject<T>}
 */
function state$(initial) {
  const watchers = new Set();
  let value = initial;

  const get = () => value;
  const set = (newValue) => {
    value = newValue;
    for (const watcher of watchers) watcher(value);
  };
  const addWatch = (watcher) => {
    watchers.add(watcher);
    return () => {
      if (LOG_CLEANUP) console.debug(`Deleting watcher: ${watcher}`);
      delWatch(watcher);
    };
  };
  const delWatch = (watcher) => {
    watchers.delete(watcher);
  };
  const refresh = () => set(get());

  const state = [get, set, addWatch, delWatch, refresh];
  // Add state context to the getter
  get.__parent = state;
  set.__parent = state;
  // Mark the state with a special marker prop
  state.__stateobject = true;
  return state;
}

function isStateObj(obj) {
  return typeof obj === "object" && obj.__stateobject;
}

function isStateFun(obj) {
  return typeof obj === "function" && isStateObj(obj.__parent);
}

function normalizeState(obj) {
  if (isStateObj(obj)) return obj;
  if (isStateFun(obj)) return obj.__parent;
  return null;
}

function normalizeDeps(deps) {
  return Array.isArray(deps) ? deps : [deps];
}

// NOTE: the derived state object is a special readonly state object which does not expose a setter
function derived$(deps, compute) {
  const depGetters = normalizeDeps(deps);

  const depStates = depGetters.map((g) => {
    const state = g.__parent;
    if (!state) {
      throw new TypeError("derived$ dependencies must be state getters");
    }
    return state;
  });

  const getters = depStates.map(([getter]) => getter);

  const computeValue = () => compute(...getters.map((g) => g()));

  const [dGetter, dSetter, dWatch] = state$(computeValue());

  // watch all dependencies and recompute if one of them changes
  const unwatchers = depStates.map(([, , watch]) =>
    watch((_) => {
      dSetter(computeValue());
    })
  );

  // TODO clean up deriveds with this
  dGetter.__cleanup = () => {
    for (const unwatcher of unwatchers) unwatcher();
  };

  return [dGetter, dWatch];
}

// Remove node and its subtree
function cleanupNode(node) {
  node[SYM_CLEANUP] = true;
  node.remove();
}

// Inputs allowed for binding
const MUNDANE_INPUTS = [
  "color",
  "date",
  "text",
  "textarea",
  "password",
  "number",
  "checkbox",
  "radio",
];

function tag(name, ...children) {
  const result = document.createElement(name);

  // Unwatchers for watchers owned by this node
  const unwatchers = [];

  function registerStateObject(child) {
    const [getter, setter, watch] = child;
    const currValue = getter();

    console.debug(`Reactive value: ${currValue}`);

    const proxyNode = document.createElement("span");
    result.appendChild(proxyNode);

    // encapsulate primitive value
    if (PRIMITIVE_TYPES.includes(typeof currValue)) {
      const textNode = document.createTextNode(String(currValue));
      proxyNode.appendChild(textNode);
      const callback = (value) => proxyNode.firstChild.nodeValue = String(value);
      const unwatcher = watch(callback);
      unwatchers.push(unwatcher);
      result.classList.add("__grechaproxy__");
    }
    // encapsulate a complex value (node)
    else if (currValue instanceof Node) {
      proxyNode.appendChild(currValue);
      const callback = (value) => proxyNode.firstChild.replaceWith(value);
      const unwatcher = watch(callback);
      unwatchers.push(unwatcher);
      result.classList.add("__grechaproxy__");
    } else {
      console.error(
        `Child was not an instance of a node or primitive:\n${currValue}`
      );
    }
  }

  for (const child of children) {
    if (PRIMITIVE_TYPES.includes(typeof child)) {
      const textNode = document.createTextNode(String(child));
      result.appendChild(textNode);
    }
    // for now a 'StateObject' encapsulates a reactive value
    else if (isStateObj(child)) {
      registerStateObject(child);
    } else if (isStateFun(child)) {
      registerStateObject(child.__parent);
    }
    // other children may not be reactive
    else {
      result.appendChild(child);
    }
  }

  result.att$ = function (name, value) {
    this.setAttribute(name, value);
    return this;
  };

  result.onclick$ = function (callback) {
    this.onclick = callback;
    return this;
  };

  result.on$ = function (event, callback) {
    this.addEventListener(event, callback);
    return this;
  };

  result.style$ = function (styleObj) {
    for (const key in styleObj) this.style[key] = styleObj[key];
    return this;
  };

  result.class$ = function (...classes) {
    this.classList.add(...classes);
    return this;
  };

  result.show$ = function (stateFunction) {
    const state = stateFunction.__parent;
    if (!state) {
      throw new TypeError("Show must be added on a state getter function!");
    }
    const [geter, , watch] = state;
    const callback = (value) => (this.style.display = value ? "" : "none");
    const unwatcher = watch(callback);
    callback(geter());
    this.__unwatchers.push(unwatcher);
    return this;
  };

  result.bind$ = function (attr, stateFunction) {
    const state = stateFunction.__parent;
    if (!state) {
      throw new TypeError("Bind must be added on a state getter function!");
    }
    const inputType = result.getAttribute("type");
    if (!MUNDANE_INPUTS.includes(inputType)) {
      throw new TypeError(
        `Bind may only be added on allowed input types: ${MUNDANE_INPUTS}`
      );
    }
    const [geter, setter, watch] = state;
    const callback = (value) => (this[attr] = value);
    const unwatcher = watch(callback);
    callback(geter());
    this.__unwatchers.push(unwatcher);

    let handler;
    if (inputType === "number")
      handler = (evt) => setter(Number(evt.target.value || NaN));
    else if (["checkbox", "radio"].includes(inputType))
      handler = (evt) => setter(evt.target.checked);
    else handler = (evt) => setter(String(evt.target.value || ""));

    return this.on$("input", handler);
  };

  result.hook$ = function ({
    onCreated = undefined,
    onMounted = undefined,
    onRemoved = undefined,
  }) {
    onCreated?.();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node === this) onMounted?.();
        });
        mutation.removedNodes.forEach((node) => {
          if (node === this) onRemoved?.();
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return this;
  };

  result.__unwatchers = unwatchers;
  return result;
}

const MUNDANE_TAGS = [
  "canvas",
  "h1",
  "h2",
  "h3",
  "p",
  "a",
  "div",
  "span",
  "select",
  "button",
];
for (let tagName of MUNDANE_TAGS) {
  window[tagName] = (...children) => tag(tagName, ...children);
}

function img(src) {
  return tag("img").att$("src", src);
}

function input(type) {
  return tag("input").att$("type", type);
}

function router(routes) {
  let result = div();

  function syncHash() {
    let hashLocation = document.location.hash.split("#")[1];
    if (!hashLocation) {
      hashLocation = "/";
    }

    if (!(hashLocation in routes)) {
      // TODO(#2): make the route404 customizable in the router component
      const route404 = "/404";

      console.assert(route404 in routes);
      hashLocation = route404;
    }

    result.replaceChildren(routes[hashLocation]);

    return result;
  }

  syncHash();

  // TODO(#3): there is way to "destroy" an instance of the router to make it remove it's "hashchange" callback
  window.addEventListener("hashchange", syncHash);

  return result;
}

function ite$(stateFunction, thenTag, elseTag) {
  const state = stateFunction.__parent;
  if (!state) {
    throw new TypeError(
      "If-then-else must be created on a state getter function!"
    );
  }
  const [getter, setter, watch] = state;

  const iteNode = span(getter() ? thenTag : elseTag);
  watch((value) => iteNode.firstChild.replaceWith(value ? thenTag : elseTag));
  return iteNode;
}

function for$(
  stateFunction,
  itemComponentFun,
  { id = (item) => item, filter = undefined } = {}
) {
  const state = stateFunction.__parent;
  if (!state) {
    throw new TypeError(
      "For must be created on a state getter function of array!"
    );
  }
  const [getter, setter, watch] = state;
  // NOTE: maybe check if there is such a thing as iterable in JS
  if (!(getter() instanceof Array)) {
    throw new TypeError(
      "For must be created on a state getter function of array!"
    );
  }

  let filterGetter = null;
  if (filter) {
    if (!normalizeState(filter)) {
      throw new TypeError(
        "For filter must be a reactive state object."
      );
    } else {
      filter = normalizeState(filter);
      filterGetter = filter[0];
    }
  }

  const forNode = span();
  let nodeMap = new Map();

  const reconcile = (items) => {
    const itemComponents = document.createDocumentFragment();
    const newNodeMap = new Map();
    const currentFilter = filter ? filterGetter() : null;

    for (const item of items) {
      const key = id(item);
      let node;
      if (nodeMap.has(key)) {
        // use the old value
        node = nodeMap.get(key);
        nodeMap.delete(key);
      } else {
        node = itemComponentFun(item);
      }
      // Apply filter immediately to new or reused nodes
      if (currentFilter) {
        node.style.display = currentFilter(item) ? "" : "none";
      }
      newNodeMap.set(key, node);
      itemComponents.appendChild(node);
    }

    nodeMap.forEach((node) => cleanupNode(node));
    nodeMap = newNodeMap;

    forNode.replaceChildren(itemComponents);
  };

  reconcile(getter());
  watch(reconcile);

  if (filter) {
    const [, , watchFilter] = filter;
    let animationFrameId = null;

    watchFilter((currentFilter) => {
      // Cancel any pending filter task if a new one starts (debouncing)
      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      const items = getter();
      const total = items.length;
      const chunkSize = 200; // Adjust based on performance testing
      let index = 0;

      function processChunk() {
        const end = Math.min(index + chunkSize, total);

        for (; index < end; index++) {
          const item = items[index];
          const node = nodeMap.get(id(item));
          if (node) {
            const shouldShow = currentFilter(item);
            // Minimal DOM interaction
            if (node.style.display !== (shouldShow ? "" : "none")) {
              node.style.display = shouldShow ? "" : "none";
            }
          }
        }

        if (index < total) {
          // More items to process, schedule next chunk
          animationFrameId = requestAnimationFrame(processChunk);
        } else {
          animationFrameId = null;
        }
      }

      animationFrameId = requestAnimationFrame(processChunk);
    });
  }

  return forNode;
}

const mutationObserver = new MutationObserver((mutations) => {
  const cleanSubtree = (node) => {
    const remWatchers = (node) => {
      const unwatchers = node.__unwatchers;
      if (!unwatchers || !unwatchers.length) return;
      if (!(unwatchers instanceof Array)) {
        console.error("Node unwatchers is not an array, returning.");
        console.debug(`Node unwatchers: ${unwatchers}`);
        return;
      }
      if (LOG_CLEANUP)
        console.debug(`Calling ${unwatchers.length} unwatcher(s).`);
      for (const unwatcher of unwatchers) unwatcher();
    };
    remWatchers(node);
    const proxyNodes = node.querySelectorAll(".__grechaproxy__");
    proxyNodes.forEach(remWatchers);
  };

  for (const mutation of mutations) {
    // Created nodes
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1 || node.nodeType === 3) {
        // NOTE: add post create event emits here later
      }
    });
    // Removed nodes
    mutation.removedNodes.forEach((node) => {
      if (node.nodeType === 1 || node.nodeType === 3) {
        // Remove all watchers in subtree before
        // removing a node node marked for destruction
        if (node[SYM_CLEANUP]) {
          console.debug("REMOVING NODE:", node);
          cleanSubtree(node);
        }
      }
    });
  }
});

mutationObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

export const Grecha = {
  state$,
  isStateObj,
  isStateFun,
  normalizeState,
  derived$,
  cleanupNode,
  tag,
  img,
  input,
  router,
  ite$,
  for$,
  MUNDANE_TAGS,
  MUNDANE_INPUTS,
};

for (const [k, v] of Object.entries(Grecha)) {
  window[k] = v;
}
