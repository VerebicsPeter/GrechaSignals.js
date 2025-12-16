const PRIMITIVE_TYPES = ["string", "number", "boolean"];

function state$(initial) {
    const watchers = new Set();
    let value = initial;
    
    const get = () => value;
    const set = (newValue) => {
        value = newValue;
        for ( const watcher of watchers ) watcher(value); 
    };
    const addWatch = (watcher) => {
        watchers.add(watcher);
        return () => delWatch(watcher);
    }
    const delWatch = (watcher) => {
        watchers.delete(watcher);
    }
    const refresh = () => set(get());

    const state = [get, set, addWatch, delWatch, refresh];
    // Add state context to the getter
    get.__parent = state;
    set.__parent = state;
    // Mark the state with a special marker prop
    state.__stateobject = true;
    return state;
}

function isStateObject(obj) {
    return typeof(obj) === "object" && obj.__stateobject;
}

function isStateFunction(obj) {
    return typeof(obj) === "function" && isStateObject(obj.__parent);
}

function normalizeDeps(deps) {
    return Array.isArray(deps) ? deps : [deps];
}

// NOTE: the derived state object is a special readonly state object which does not expose a setter
function derived$(deps, compute) {
    const depGetters = normalizeDeps(deps);

    const depStates = depGetters.map(g => {
        const state = g.__parent;
        if ( !state ) {
            throw new TypeError("derived$ dependencies must be state getters");
        }
        return state;
    });

    const getters = depStates.map(([getter]) => getter);

    const computeValue = () => compute(...getters.map(g => g()));

    const [dGetter, dSetter, dWatch] = state$(computeValue());

    // watch all dependencies and recompute if one of them changes
    const unwatchers = depStates.map(([,, watch]) =>
        watch((_) => {dSetter(computeValue())})
    );

    dGetter.__cleanup = () => {
        for (const unwatcher of unwatchers) unwatcher();
    };

    return [dGetter, dWatch];
}

function tag(name, ...children) {
    const result = document.createElement(name);

    function registerStateObject(child) {
        const [ getter, setter, watch, unwatch ] = child;
        const currValue = getter();
        
        console.debug(`Reactive value: ${currValue}`);

        const MakeRemoveHook = (callback) => {
            return () => {
                console.debug(`Removing the node watcher: ${callback}`);
                unwatch(callback);
            };
        };

        const proxyNode = document.createElement("span");
        result.appendChild(proxyNode);

        // encapsulate primitive value
        if (PRIMITIVE_TYPES.includes(typeof(currValue))) {
            const textNode = document.createTextNode(String(currValue));
            proxyNode.appendChild(textNode);
            const callback = (value) => proxyNode.firstChild.nodeValue = String(value);
            watch(callback);
            proxyNode.parentElement.addEventListener("dom:removed", MakeRemoveHook(callback));
        } 
        // encapsulate a complex value (node)
        else if (currValue instanceof Node) {
            proxyNode.appendChild(currValue);
            const callback = (value) => proxyNode.firstChild.replaceWith(value);
            watch(callback);
            proxyNode.parentElement.addEventListener("dom:removed", MakeRemoveHook(callback));
        }
        else {
            console.error(`Child was not an instance of a node or primitive:\n${currValue}`);
        }
    }

    for (const child of children) {
        if (PRIMITIVE_TYPES.includes(typeof(child))) {
            const textNode = document.createTextNode(String(child));
            result.appendChild(textNode);
        }
        // for now a 'StateObject' encapsulates a reactive value
        else if (isStateObject(child)) {
            registerStateObject(child);
        }
        else if (isStateFunction(child)) {
            registerStateObject(child.__parent);
        }
        // other children may not be reactive
        else {
            result.appendChild(child);
        }
    }

    result.att$ = function(name, value) {
        this.setAttribute(name, value);
        return this;
    };

    result.onclick$ = function(callback) {
        this.onclick = callback;
        return this;
    };

    result.on$ = function(event, callback) {
        this.addEventListener(event, callback);
        return this;
    };

    result.style$ = function(styleObj) {
        for (const key in styleObj) this.style[key] = styleObj[key];
        return this;
    };

    result.class$ = function(...classes) {
        this.classList.add(...classes);
        return this;
    };

    result.show$ = function(stateFunction) {
        // TODO: think about how these could be cleaned up
        const state = stateFunction.__parent;
        if ( !state ) {
            throw new TypeError("Show must be added on a state getter function!");
        }
        const [ geter,, watch ] = state;
        const watcher = (value) => (this.style.display = value ? "block" : "none");
        const unwatcher = watch(watcher);
        watcher(geter());
        this.__cleanup = unwatcher;
        return this;
    };

    return result;
}

const MUNDANE_TAGS = ["canvas", "h1", "h2", "h3", "p", "a", "div", "span", "select", "button"];
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
        let hashLocation = document.location.hash.split('#')[1];
        if (!hashLocation) {
            hashLocation = '/';
        }

        if (!(hashLocation in routes)) {
            // TODO(#2): make the route404 customizable in the router component
            const route404 = '/404';

            console.assert(route404 in routes);
            hashLocation = route404;
        }

        result.replaceChildren(routes[hashLocation]);

        return result;
    };

    syncHash();

    // TODO(#3): there is way to "destroy" an instance of the router to make it remove it's "hashchange" callback
    window.addEventListener("hashchange", syncHash);

    return result;
}

const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
    // Created nodes
    mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1 || node.nodeType === 3) {
            node.dispatchEvent(new CustomEvent("dom:created", {bubbles: true}));
        }
    });
    // Removed nodes
    mutation.removedNodes.forEach(node => {
        if (node.nodeType === 1 || node.nodeType === 3) {
            node.dispatchEvent(new CustomEvent("dom:removed", {bubbles: true}));
            console.debug("REMOVING NODE:\n", node);
        }
    });
    }
});

mutationObserver.observe(document.documentElement, { childList: true, subtree: true });


function ite$(stateFunction, thenTag, elseTag) {
    const state = stateFunction.__parent;
    if ( !state ) {
        throw new TypeError("If-then-else must be created on a state getter function!");
    }
    const [ getter, setter, watch ] = state;
    
    // TODO: clean the children up when they are removed
    const iteNode = span(getter()?thenTag:elseTag);
    watch(value => iteNode.firstChild.replaceWith(value?thenTag:elseTag));
    return iteNode;
}

function for$(stateFunction, itemComponentFunction) {
    const state = stateFunction.__parent;
    if ( !state ) {
        throw new TypeError("For must be created on a state getter function of array!");
    }
    const [ getter, setter, watch ] = state;
    const items = getter();
    // NOTE: maybe check if there is such a thing as iterable in JS
    if (!(items instanceof Array)) {
        throw new TypeError("For must be created on a state getter function of array!");
    }
    // TODO: clean the children up when they are removed
    const forNode = span(span(...items.map(itemComponentFunction)));
    watch(items => forNode.firstChild.replaceWith(span(...items.map(itemComponentFunction))));
    return forNode;
}
