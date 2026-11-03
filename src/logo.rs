// Skala 12:1 dari master (kotak 96, celah 24, lubang 48) disesuaikan sel terminal 1:2.
pub const BANNER: &str = concat!(
    "████████  ████████\n",
    "████████  ██    ██  VOLTA.\n",
    "████████  ██    ██  MQTT-only IoT server\n",
    "████████  ████████",
);

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
