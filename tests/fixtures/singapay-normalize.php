<?php
// Regenerate fixtures: php tests/fixtures/singapay-normalize.php
// Mirrors the official SingaPay PHP verification sample: json_decode(assoc),
// recursive ksort(SORT_STRING), json_encode(UNESCAPED_UNICODE|UNESCAPED_SLASHES).
function s(&$x){ksort($x, SORT_STRING); foreach($x as &$v) if(is_array($v)) s($v);}
function n($raw){ $d=json_decode($raw,true); s($d); return json_encode($d, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); }
$cases = [
 '{"b":1,"a":{"d":[3,1],"c":"x"}}',
 '{ "url" : "https://a.b/c", "name": "Andé 日本" }',
 '{"a":"é\/\n"}',
 "{\"a\":\"x\u{2028}y\"}",
 '{"amount":100000.0,"rate":1.50,"tiny":0.00001,"big":1e15,"huge":1e17,"n":-0,"nf":-0.0,"z":0.0,"e":2.5E-7,"p":123456789.125}',
 '{"id":9007199254740993,"over":99999999999999999999}',
 '{"meta":{},"list":[]}',
 '{"1":"b","0":"a"}',
 '[0,1,2,3,4,5,6,7,8,9,10]',
 '{"b":1,"B":2,"_":3,"é":4,"10":5,"9":6}',
 '{"a":"c\u0001\u007f\t\"\\\\"}',
 '{"a":1,"a":2,"b":3}',
 '{"x":true,"y":false,"z":null}',
];
$out = [];
foreach ($cases as $c) $out[] = ["raw" => $c, "normalized" => n($c)];
file_put_contents(__DIR__ . "/singapay-normalize.json", json_encode($out, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) . "\n");
