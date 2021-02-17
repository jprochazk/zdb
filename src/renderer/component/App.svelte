<script lang="typescript">
    import Router, { location, push } from "svelte-spa-router";
    import Upload from "./Upload.svelte";
    import Search from "./Search.svelte";

    if ($location === "/") {
        push("/search");
    }

    const routes = {
        "/search": Search,
        "/upload": Upload,
    };

    console.log(`ZDB loaded.`);
</script>

<div class="no-overflow">
    <nav class="nav-extended blue lighten-5" role="navigation">
        <div class="nav-content">
            <ul class="tabs">
                <li class="tab left" class:active={$location === "/search"}>
                    <a href="#/search">
                        <span class="black-text">Vyhledat</span>
                    </a>
                </li>
                <li class="tab left" class:active={$location === "/upload"}>
                    <a href="#/upload">
                        <span class="black-text">Nahrát</span>
                    </a>
                </li>
            </ul>
        </div>
    </nav>
    <div class="container body">
        <Router {routes} />
    </div>
</div>

<style>
    :global(*) {
        overflow: hidden;
    }

    div.body {
        height: calc(100vh - 48px);
    }
</style>
