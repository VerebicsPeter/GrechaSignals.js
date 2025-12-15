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
    }
    const delWatch = (watcher) => {
        watchers.delete(watcher);
    }

    const state = [get, set, addWatch, delWatch];
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

function isDerivedState(getter, setter) {
    return getter.__derive && !setter.__parent
}

// NOTE: the derived state object is a special readonly state object which does not have a setter
// TODO: for now this is limited as it only allows one level derived state...
function derived$(stateFunction, func) {
    const state = stateFunction.__parent;
    if ( !state ) {
        throw new TypeError(`Value wrapped with derived is not a state function:\n${stateFunction}`);
    }
    const [ getter, setter, watch, unwatch ] = state;
    if (isDerivedState(getter, setter)) {
        throw new TypeError(`Value wrapped with derived comes from derived state:\n${state}`);
    }
    const dGetter = () => func(getter());
    const dSetter = () => {
        throw new Error("Tried to call setter of a derived state function.");
    }
    const derived = [ dGetter, dSetter, watch, unwatch ];
    dGetter.__parent = derived;
    dGetter.__derive = func;
    derived.__stateobject = true;
    return derived;
}

function tag(name, ...children) {
    const result = document.createElement(name);

    function registerStateObject(child) {
        const [ getter, setter, watch, unwatch ] = child;
        const currValue = getter();
        
        const isDerived = isDerivedState(getter, setter);
        const valWrapper = isDerived ? getter.__derive : (x) => x; 
        
        if ( !isDerived ) {
            console.debug("Reactive value:");
            console.debug(currValue);
        } else {
            console.debug("Derived value:");
            console.debug(currValue);
        }

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
            const textNode = document.createTextNode(String(getter()));
            proxyNode.appendChild(textNode);
            const callback = (value) => proxyNode.firstChild.nodeValue = String(valWrapper(value));
            watch(callback);
            proxyNode.parentElement.addEventListener("dom:removed", MakeRemoveHook(callback));
        }
        // encapsulate a complex value (node)
        else {
            proxyNode.appendChild(currValue);
            const callback = (value) => proxyNode.firstChild.replaceWith(valWrapper(value));
            watch(callback);
            proxyNode.parentElement.addEventListener("dom:removed", MakeRemoveHook(callback));
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

    result.style$ = function(styleObj) {
        for (const key in styleObj) this.style[key] = styleObj[key];
        return this;
    }

    result.class$ = function(...classes) {
        this.classList.add(...classes);
        return this;
    };

    return result;
}

const MUNDANE_TAGS = ["canvas", "h1", "h2", "h3", "p", "a", "div", "span", "select"];
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
        node.dispatchEvent(new CustomEvent("dom:created", {bubbles:false}));
      }
    });

    // Removed nodes
    mutation.removedNodes.forEach(node => {
      if (node.nodeType === 1 || node.nodeType === 3) {
        node.dispatchEvent(new CustomEvent("dom:removed", {bubbles:false}));
      }
    });
  }
});

mutationObserver.observe(document.documentElement, {
  childList: true,
  subtree: true
});


function ite$(stateFunction, thenTag, elseTag) {
    const state = stateFunction.__parent;
    if ( !state ) {
        throw new TypeError("If-then-else must be created on a state getter function!");
    }
    const [ getter, setter, watch ] = state;
    if (isDerivedState(getter, setter)) {
        throw new TypeError("If-then-else must be created on a state getter function!");
    }
    
    const iteNode = span(getter()?thenTag:elseTag);
    watch(value => iteNode.firstChild.replaceWith(value?thenTag:elseTag));
    return iteNode;
}
