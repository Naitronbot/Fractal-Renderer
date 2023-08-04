import * as esbuild from "esbuild";

if (process.argv.length != 3) {
   console.log("Invalid arguments");
} else {

    const settings = {
        entryPoints: ["src/fractal.ts"],
        bundle: true,
        minify: true,
        target: ["chrome58","firefox57","safari16","edge80"],
        outfile: "static/fractal.js",
        banner: {
            js: "// Looking for source?\n// https://github.com/Naitronbot/Fractal-Renderer/\n"
        }
    };
    if (process.argv[2] === "watch") {
        const ctx = await esbuild.context(settings);
        await ctx.watch();
    } else if (process.argv[2] === "build") {
        await esbuild.build(settings);
    } else if (process.argv[2] === "dev") {
        settings.minify = false;
        settings.sourcemap = true;
        await esbuild.build(settings);
    } else {
        console.log("Invalid arguments");
    }

}