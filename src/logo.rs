pub const BANNER: &str = concat!(
    "████  ████\n",
    "████  █  █  VOLTA.\n",
    "████  █  █  MQTT-only IoT server\n",
    "████  ████",
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
        assert!(rows[0].starts_with("████  ████"));
        assert!(rows[3].starts_with("████  ████"));
        assert!(rows[1].contains("█  █"));
        assert!(rows[2].contains("█  █"));
    }
}
