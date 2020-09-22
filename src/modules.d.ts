declare module 'textversionjs' {
    export default function textVersion(htmlString: string, config?: {
        linkProcess(href: string, linkText: string): string
    }): string
}
