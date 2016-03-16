package main

import (
	"crypto/tls"
	"crypto/x509"
	"flag"
	"io"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"fmt"
)

func msg() {
	fmt.Printf("You must specified starting mode !\n")
}

type ConsulHandler struct {
	path string
}

func (h *ConsulHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := net.Dial("tcp", h.path)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	c := httputil.NewClientConn(conn, nil)
	defer c.Close()

	res, err := c.Do(r)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	defer res.Body.Close()

	copyHeader(w.Header(), res.Header)
	if _, err := io.Copy(w, res.Body); err != nil {
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

func createTcpHandler(e string) http.Handler {
	u, err := url.Parse(e)
	if err != nil {
		log.Fatal(err)
	}
	return httputil.NewSingleHostReverseProxy(u)
}

func createHandler(dir string, e string, e2 string, e3 string, e4 string) http.Handler {
	var (
		mux         = http.NewServeMux()
		fileHandler = http.FileServer(http.Dir(dir))
		dockerHandler http.Handler
		dockerHandlerTls http.Handler
		dockerHandlerRepo http.Handler
		h           http.Handler
	)

	h = createTcpHandler(e)
	dockerHandler = createTcpHandler(e2)
	dockerHandlerTls = createTcpHandler(e3)
	dockerHandlerRepo = createTcpHandler(e4)

	mux.Handle("/consulapi/", http.StripPrefix("/consulapi", h))
	mux.Handle("/swarmuiapi/", http.StripPrefix("/swarmuiapi", dockerHandler))
	mux.Handle("/swarmuiapitls/", http.StripPrefix("/swarmuiapitls", dockerHandlerTls))
	mux.Handle("/swarmuiapirepo/", http.StripPrefix("/swarmuiapirepo", dockerHandlerRepo))
	mux.Handle("/", fileHandler)
	return mux
}

func sendHttp(w http.ResponseWriter, r *http.Request, client *http.Client) {

    req, err := http.NewRequest(r.Method, "http:/" + r.URL.Path + "?" + r.URL.RawQuery, r.Body)
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

func sendHttps(w http.ResponseWriter, r *http.Request, client *http.Client) {
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

func swarmui() {
	if len(os.Args) > 1 {
		consul := os.Args[1]

		var (
			endpoint = flag.String("e", consul, "Consul endpoint")
			endpoint2 = flag.String("e2", "http://localhost:9001", "Dockers endpoint")
			endpoint3 = flag.String("e3", "http://localhost:9002", "Dockers TLS endpoint")
			endpoint4 = flag.String("e4", "http://localhost:9003", "Dockers REPO endpoint")
			addr     = flag.String("p", ":9000", "Address and port to serve swarmui")
			assets   = flag.String("a", ".", "Path to the assets")
		)

		handler := createHandler(*assets, *endpoint, *endpoint2, *endpoint3, *endpoint4)
		go func() {
			if err := http.ListenAndServe(*addr, handler); err != nil {
				log.Println(handler)
				log.Fatal(err)
			}
		}()
	} else {
		msg()
	}

}

func docker() {
    tr := &http.Transport{
        DisableCompression: true,
        DisableKeepAlives: false,
    }
    client := &http.Client{Transport: tr}

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        sendHttp(w, r, client)
    })
    log.Fatal(http.ListenAndServe(":9001", nil))
}


func dockerRepo() {
	repo := http.NewServeMux()
	if len(os.Args) > 2 {
	  	myProxy := os.Args[2]
	    url_i := url.URL{}
	    url_proxy, _ := url_i.Parse(myProxy)

	    tr := &http.Transport{
	      DisableCompression: false,
	      DisableKeepAlives: false,
	      Proxy: http.ProxyURL(url_proxy),
	      TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	    }
	    clientRepo := &http.Client{Transport: tr}
	    
	    repo.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	      	sendHttps(w, r, clientRepo)
	  	})
		log.Fatal(http.ListenAndServe(":9003", repo))
	} else {
		tr := &http.Transport{
	      DisableCompression: false,
	      DisableKeepAlives: false,
	      TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	    }
	    clientRepo := &http.Client{Transport: tr}

		repo.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
	    	sendHttps(w, r, clientRepo)
	  	})
		log.Fatal(http.ListenAndServe(":9003", repo))
	}
}

func dockerTls() {
    var (
        certFile = flag.String("cert", "certs/cert.pem", "A PEM eoncoded certificate file.")
        keyFile  = flag.String("key", "certs/key.pem", "A PEM encoded private key file.")
        caFile   = flag.String("CA", "certs/ca.pem", "A PEM eoncoded CA's certificate file.")
    )

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

    tls := http.NewServeMux()

    tls.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        sendHttps(w, r, client)
    })
    go func() {
    	log.Fatal(http.ListenAndServe(":9002", tls))
    }()

}

func main() {

	if len(os.Args) > 1 {

		flag.Parse()

		fmt.Printf("Starting swarmui server\n")
		swarmui()
		fmt.Printf("Starting Dockers Tls endpoint\n")
		dockerTls()
		fmt.Printf("Starting Dockers Repo endpoint\n")
		dockerRepo()

	} else {
		msg()
	}
}
