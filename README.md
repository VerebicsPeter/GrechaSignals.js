# Grecha Signals

![KashaHard](KashaHard.gif)

**Grecha Signals** is an experimental fork of [Grecha.js](https://github.com/tsoding/grecha.js) by Alexey Kutepov. It explores signal-based reactivity where state updates directly mutate the DOM. It allows basic reactivity without a virtual DOM, JSX, or any build steps. Sadly the library could not be kept to 69 LoC :).

## Quick Start

```html
<!DOCTYPE html>
<html>
  <head><title>Grecha Signals</title></head>
  <body>
    <div id="entry"></div>
    <script src="./grecha.js"></script>
    <script>
      const LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
      const kashaSoft = img("Kasha.png");
      const kashaHard = img("KashaHard.gif");

      const [count, setCount, watchCount] = state$(0);
      const [kasha, setKasha, watchKasha] = state$(kashaSoft);
      const [getToggle, setToggle] = state$(false);
      const [doubleCount] = derived$(count, (x) => 2*x);

      
      watchCount((count) => {
        console.log(`Count changed to ${count}.`);
      });
      
      const root = router({
        "/": div(
          h1("Grecha.js"),
          div(a("Foo").att$("href", "#/foo")),
          div(a("Bar").att$("href", "#/bar")),
          div("Count x1: ", span(count)),
          div("Count x2: ", span(doubleCount)),
          div("It's a: ", ite$(getToggle, span("foo"), span("bar")))
          .style$({ cursor: "pointer", border: "1px solid black" })
          .onclick$(() => setToggle(!getToggle())),
          div(kasha)
          .onclick$(
            () => {
              const newCount = count()+1
              setCount(newCount)
              setKasha((newCount % 2) ? kashaHard : kashaSoft)
            }
          )
        ),
        "/foo": div(h1("Foo"), p(LOREM), a("Home").att$("href", "#")),
        "/bar": div(h1("Bar"), p(LOREM), a("Home").att$("href", "#")),
      });

      entry.appendChild(root);
    </script>
  </body>
</html>

```
