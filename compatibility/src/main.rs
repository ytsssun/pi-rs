use serde_json::Value;
use std::io::{self, BufRead};
fn main() {
    for line in io::stdin().lock().lines() {
        let v: Value = serde_json::from_str(&line.unwrap()).expect("JSON input");
        println!("{}", pi_rs_compat::truncate(&v));
    }
}
