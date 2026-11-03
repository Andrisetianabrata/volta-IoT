use std::time::Duration;

use clap::Parser;
use volta::bench::{run, BenchConfig};

#[derive(Parser, Debug)]
#[command(name = "bench", about = "VOLTA. HTTP benchmark: request per menit")]
struct BenchArgs {
    #[arg(long, default_value = "127.0.0.1")]
    host: String,
    #[arg(long, default_value_t = 9443)]
    port: u16,
    #[arg(long, default_value = "/healthz")]
    path: String,
    #[arg(long, default_value_t = 60)]
    duration_secs: u64,
    #[arg(long, default_value_t = 10)]
    concurrency: usize,
}

#[tokio::main]
async fn main() {
    let a = BenchArgs::parse();
    println!(
        "target http://{}:{}{} | {} dtk | {} koneksi",
        a.host, a.port, a.path, a.duration_secs, a.concurrency
    );
    let rep = run(BenchConfig {
        host: a.host,
        port: a.port,
        path: a.path,
        duration: Duration::from_secs(a.duration_secs),
        concurrency: a.concurrency,
    })
    .await;
    println!(
        "total {} | gagal {} | {:.1} dtk | {:.0} req/menit ({:.0} req/detik)",
        rep.total,
        rep.errors,
        rep.elapsed_secs,
        rep.requests_per_minute,
        rep.requests_per_minute / 60.0
    );
}
