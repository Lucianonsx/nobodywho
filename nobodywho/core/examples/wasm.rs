use nobodywho::chat::{ChatConfig, ChatHandleAsync};
use nobodywho::llm;
use std::sync::Arc;
use tracing::Event;
use tracing_subscriber::fmt::format::{DefaultFields, Writer};
use tracing_subscriber::fmt::{FmtContext, FormatFields};
use tracing_subscriber::Registry;

#[tokio::main(flavor = "current_thread")]
async fn main() {
    nobodywho::send_llamacpp_logs_to_tracing();

    let f: fn(
        &FmtContext<'_, Registry, DefaultFields>,
        Writer<'_>,
        &Event<'_>,
    ) -> core::fmt::Result = |ctx, mut w, e| {
        let meta = e.metadata();
        write!(w, "{:>5} {}: ", meta.level(), meta.target())?;
        ctx.field_format().format_fields(w.by_ref(), e)?;
        writeln!(w)
    };

    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::TRACE)
        .without_time()
        .with_file(false)
        .with_span_events(tracing_subscriber::fmt::format::FmtSpan::CLOSE)
        .event_format(f)
        .init();

    // tracing_wasm::try_set_as_global_default().ok();

    tracing::trace!("test");

    tracing::debug!("test");

    tracing::info!("test");

    let mut args = std::env::args();
    let _ = args.next().unwrap();
    let path = args.next().expect("model path");
    let model = Arc::new(
        llm::get_model(&path, true, None, None, None)
            .unwrap_or_else(|e| panic!("failed to load test model from {path:?}: {e}")),
    );
    tracing::info!("LOADED");

    let chat = ChatHandleAsync::new(
        model,
        ChatConfig {
            n_ctx: 1024,
            ..Default::default()
        },
    )
    .unwrap();
    tracing::info!("CHAT CREATED");

    let mut stream = chat.ask("What is the capital of Denmark?");
    while let Some(token) = stream.next_token().await.unwrap() {
        tracing::info!("token: {token}");
    }

    tracing::info!("DONE");
}
