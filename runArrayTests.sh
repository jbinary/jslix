#!/bin/bash
java -jar JsTestDriver-1.3.4.b.jar --testOutput test-arr-output/ --tests arrayTest --browser /usr/lib/firefox/firefox --port 4242
cd test-arr-output
genhtml jsTestDriver.conf-coverage.dat
