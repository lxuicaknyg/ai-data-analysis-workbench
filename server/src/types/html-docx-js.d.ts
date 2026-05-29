declare module 'html-docx-js' {
  interface AsBlobFunction {
    (html: string): Blob
  }

  interface HtmlDocxModule {
    asBlob: AsBlobFunction
    default?: HtmlDocxModule
  }

  const module: HtmlDocxModule
  export = module
}
