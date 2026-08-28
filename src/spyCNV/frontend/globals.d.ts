import type { InitConfig } from "./types";

/**
 * Declarations for global libraries.
 *
 * spyCNV does not import libraries, but inject them dicertly with <script>
 * tags in order to make a standalone HTML. These globals only provide type
 * information for LSP.
 */
declare global {
    const genomeSpyEmbed: {
        embed(
            container: HTMLElement,
            spec: unknown,
            options?: { namedDataProvider?: (name: string) => unknown }
        ): Promise<GenomeSpyEmbed>;
    };

    interface GenomeSpyEmbed {
        updateNamedData(name: string, data: unknown): void;
        getScaleResolutionByName(name: string): GenomeScaleResolution;
    }

    interface GenomeScaleResolution {
        zoomTo(domain: unknown, animate?: boolean): void;
    }

    namespace gridjs {
        interface GridInstance {
            render(container: HTMLElement): GridInstance;
            forceRender(): void;
            on(event: string, handler: (...args: unknown[]) => void): void;
        }
        interface GridConfig {
            [key: string]: unknown;
        }
        class Grid {
            constructor(config: GridConfig);
            render(container: HTMLElement): GridInstance;
            forceRender(): void;
            on(event: string, handler: (...args: unknown[]) => void): void;
        }
        function html(content: string): unknown;
    }

    interface Window {
        spyCNV: { init: (config: InitConfig) => void };
    }
}

export { };
