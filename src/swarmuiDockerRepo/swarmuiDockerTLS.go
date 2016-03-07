package main 

import (
        "flag"
        "io"
        "log"
        "net/http"
        )

func main() {

        
        flag.Parse()

        tr := &http.Transport{
                DisableCompression: false,
                DisableKeepAlives: false,
        }
        client := &http.Client{Transport: tr}

        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
                send(w, r, client)
        })
        log.Fatal(http.ListenAndServe(":9003", nil))
}

func send(w http.ResponseWriter, r *http.Request, client *http.Client) {

    req, err := http.NewRequest(r.Method, "https:/" + r.URL.Path + "?" + r.URL.RawQuery, r.Body)
    if err != nil {
        log.Println(err)
    }       
    req.Header.Set("X-Custom-Header", "myvalue")
    req.Header.Set("Content-Type", "application/json")

    resp, err := client.Do(req)
    if err != nil {
        log.Println(err)
    }       
    defer resp.Body.Close()

    copyHeader(w.Header(), resp.Header)
    if _, err := io.Copy(w, resp.Body); err != nil {
        log.Println(err)
    }
}

func copyHeader(dst, src http.Header) {
    for k, vv := range src {
        for _, v := range vv {
            dst.Add(k, v)
        }
    }
}