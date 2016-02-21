package main 

import (
        "crypto/tls"
        "crypto/x509"
        "io/ioutil"
        "flag"
        "io"
        "log"
        "net/http"
        )

func main() {

        var (
            certFile = flag.String("cert", "certs/cert.pem", "A PEM eoncoded certificate file.")
            keyFile  = flag.String("key", "certs/key.pem", "A PEM encoded private key file.")
            caFile   = flag.String("CA", "certs/ca.pem", "A PEM eoncoded CA's certificate file.")
        )

        flag.Parse()

        // Load client cert
        cert, err := tls.LoadX509KeyPair(*certFile, *keyFile)
        if err != nil {
            log.Fatal(err)
        }

        // Load CA cert
        caCert, err := ioutil.ReadFile(*caFile)
        if err != nil {
            log.Fatal(err)
        }
        caCertPool := x509.NewCertPool()
        caCertPool.AppendCertsFromPEM(caCert)

        // Setup HTTPS client
        tlsConfig := &tls.Config{
            Certificates: []tls.Certificate{cert},
            RootCAs:      caCertPool,
        }
        tlsConfig.BuildNameToCertificate()

        tr := &http.Transport{
                DisableCompression: false,
                DisableKeepAlives: false,
                TLSClientConfig: tlsConfig,
        }
        client := &http.Client{Transport: tr}

        http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
                send(w, r, client)
        })
        log.Fatal(http.ListenAndServe(":9002", nil))
}

func send(w http.ResponseWriter, r *http.Request, client *http.Client) {

        req, err := http.NewRequest(r.Method, "https:/" + r.URL.Path + "?" + r.URL.RawQuery, nil)
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