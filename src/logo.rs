// Skala 12:1 dari master (kotak 96, celah 24, lubang 48) disesuaikan sel terminal 1:2.
// BANNER polos untuk --help, log file, dan pipe. Untuk terminal pakai banner_colored().
pub const BANNER: &str = concat!(
    "████████  ████████\n",
    "████████  ██    ██  VOLTA. v",
    env!("CARGO_PKG_VERSION"),
    "\n",
    "████████  ██    ██  MQTT IoT server\n",
    "████████  ████████",
);

// Copper #C07A24 dari VOLTA-guidelines.md §4 (192,122,36).
const COPPER: &str = "\x1b[38;2;192;122;36m";
const RESET: &str = "\x1b[0m";

pub fn banner_colored() -> String {
    format!(
        "{c}████████  ████████{r}\n{c}████████  ██    ██{r}  VOLTA. v{v}\n{c}████████  ██    ██{r}  MQTT IoT server\n{c}████████  ████████{r}",
        c = COPPER,
        r = RESET,
        v = env!("CARGO_PKG_VERSION"),
    )
}

pub fn supports_color() -> bool {
    if std::env::var_os("NO_COLOR").is_some() {
        return false;
    }
    if std::env::var("TERM").as_deref() == Ok("dumb") {
        return false;
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn banner_names_volta() {
        assert!(BANNER.contains("VOLTA."));
    }

    #[test]
    fn banner_is_four_aligned_rows() {
        let rows: Vec<&str> = BANNER.lines().collect();
        assert_eq!(rows.len(), 4);
        for row in &rows {
            assert!(row.starts_with('█'));
        }
    }

    #[test]
    fn banner_shows_solid_and_ring() {
        let rows: Vec<&str> = BANNER.lines().collect();
        assert_eq!(rows[0], "████████  ████████");
        assert_eq!(rows[3], "████████  ████████");
        assert!(rows[1].starts_with("████████  ██    ██"));
        assert!(rows[2].starts_with("████████  ██    ██"));
    }
}
