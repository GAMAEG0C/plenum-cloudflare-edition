import { createServerFn } from "@tanstack/react-start";
export const fn = createServerFn({method: 'POST'}).handler((ctx) => {
    console.log(Object.keys(ctx));
});
