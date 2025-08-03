from http.server import BaseHTTPRequestHandler
import json
import logging
from urllib.parse import urlparse, parse_qs
from sqlglot import diff, parse
from sqlglot.expressions import Expression, Create
from sqlglot.expressions import DataType, DataTypeParam, Literal, ColumnDef, Constraint, PrimaryKey, ForeignKey, PrimaryKeyColumnConstraint

logging.basicConfig(level=logging.DEBUG)

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests for schema comparison"""
        try:
            # Set CORS headers
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()

            # Get request body
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)

            # Parse JSON data
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error_response(400, "Invalid JSON in request body")
                return

            # Extract schemas
            schema1_str = data.get("schema1", "")
            schema2_str = data.get("schema2", "")

            if not schema1_str or not schema2_str:
                self.send_error_response(400, "Both schema1 and schema2 are required")
                return

            # Process schemas
            result = self.compare_schemas(schema1_str, schema2_str)

            # Send successful response
            response = {"diff": result}
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except Exception as e:
            logging.error(f"Error processing request: {str(e)}")
            self.send_error_response(500, f"Internal server error: {str(e)}")

    def send_error_response(self, status_code, message):
        """Send error response with proper headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        error_response = {"error": message}
        self.wfile.write(json.dumps(error_response).encode('utf-8'))

    def compare_schemas(self, schema1_str, schema2_str):
        """Main schema comparison logic"""
        ast1 = parse(schema1_str)
        ast2 = parse(schema2_str)

        ast1_clean = self.strip_datatypes(ast1)
        ast2_clean = self.strip_datatypes(ast2)

        tables1 = set(self.get_table_names(ast1_clean))
        tables2 = set(self.get_table_names(ast2_clean))

        only_in_1 = tables1 - tables2
        only_in_2 = tables2 - tables1
        common_tables = tables1 & tables2

        results = []

        if only_in_1:
            results.append(f"Tables only in schema 1: {only_in_1}")
        if only_in_2:
            results.append(f"Tables only in schema 2: {only_in_2}")
        if not common_tables:
            results.append("No common tables to compare.")
            return results

        for table in common_tables:
            results.append(f"\nComparing table: {table}")

            table_clean_1 = self.get_create_node_for_table(ast1_clean, table)
            table_clean_2 = self.get_create_node_for_table(ast2_clean, table)

            table_orig_1 = self.get_create_node_for_table(ast1, table)
            table_orig_2 = self.get_create_node_for_table(ast2, table)

            attr_diff = self.compare_attributes(table_clean_1, table_clean_2)
            results.append(f"Attribute differences: {attr_diff}")

            pk1 = self.primary_key_checker(table_orig_1)
            pk2 = self.primary_key_checker(table_orig_2)
            if set(pk1) == set(pk2):
                results.append("Primary keys are the same")
            else:
                results.append(f"Primary key mismatch:\n  schema1: {pk1}\n  schema2: {pk2}")

            fk1 = self.foreign_key_checker(table_orig_1)
            fk2 = self.foreign_key_checker(table_orig_2)
            if set(tuple(fk) for fk in fk1) == set(tuple(fk) for fk in fk2):
                results.append("Foreign keys are the same")
            else:
                results.append(f"Foreign key differences:\n  schema1: {fk1}\n  schema2: {fk2}")

        return results

    def compare_attributes(self, expr, expr2):
        """Compare attributes between two table expressions"""
        attributes1 = []
        attributes2 = []

        for column in expr.find_all(ColumnDef):
            attributes1.append(column.this.this)
        for column in expr2.find_all(ColumnDef):
            attributes2.append(column.this.this)

        only_in_1 = set(attributes1) - set(attributes2)
        only_in_2 = set(attributes2) - set(attributes1)

        results = []

        if not only_in_1 and not only_in_2:
            return "they're the same"
        if only_in_1:
            results.append("only in 1: " + str(only_in_1))
        if only_in_2:
            results.append("only in 2: " + str(only_in_2))

        return results

    def primary_key_checker(self, expr1):
        """Extract primary keys from table expression"""
        primary_keys = []
        for col in expr1.this.expressions:
            if col.args.get("constraints"):
                for cons in col.args["constraints"]:
                    if isinstance(cons.kind, PrimaryKeyColumnConstraint):
                        primary_keys.append(col.name)

        for expr in expr1.this.expressions:
            if isinstance(expr, PrimaryKey):
                for pk in expr.expressions:
                    primary_keys.append(pk.this)

        return primary_keys

    def foreign_key_checker(self, expr1):
        """Extract foreign keys from table expression"""
        foreign_keys = []
        for expr in expr1.this.expressions:
            if isinstance(expr, Constraint):
                for constraint in expr.expressions:
                    if isinstance(constraint, ForeignKey):
                        foreign_key = []
                        reference = constraint.args.get('reference')
                        foreign_key.append(reference.this.this.this.this)
                        for iden in reference.this.expressions:
                            foreign_key.append(iden.this)
                        foreign_keys.append(foreign_key)
            elif isinstance(expr, ForeignKey):
                foreign_key = []
                reference = expr.args.get('reference')
                foreign_key.append(reference.this.this.this.this)
                for iden in reference.this.expressions:
                    foreign_key.append(iden.this)
                foreign_keys.append(foreign_key)
        return foreign_keys

    def strip_datatypes(self, ast):
        """Remove datatypes and constraints from AST for comparison"""
        cleaned = []
        for expr in ast:
            expr_copy = expr.copy()
            for column in expr_copy.find_all(ColumnDef):
                column.set('kind', None)
                column.set('constraints', None)
            cleaned.append(expr_copy)
        return cleaned

    def get_table_names(self, ast):
        """Extract table names from AST"""
        table_names = []
        for statement in ast:
            if isinstance(statement, Create):
                table_names.append(statement.this.this)
        return table_names

    def get_create_node_for_table(self, ast, table_name):
        """Get CREATE statement for specific table"""
        for statement in ast:
            if isinstance(statement, Create):
                if statement.this.this == table_name:
                    return statement
        return None

# For Vercel deployment
def handler(request, response):
    """Vercel serverless function entry point"""
    from http.server import HTTPServer
    import io
    from urllib.parse import urlparse, parse_qs

    # Create a mock request for BaseHTTPRequestHandler
    class MockRequest:
        def __init__(self, method, path, headers, body):
            self.method = method
            self.path = path
            self.headers = headers
            self.body = body

    # Extract request information
    method = request.method
    headers = dict(request.headers)
    body = request.body if hasattr(request, 'body') else b''

    # Create handler instance
    handler_instance = Handler()

    # Mock the request/response cycle
    class MockSocket:
        def __init__(self):
            self.response_data = io.BytesIO()

        def makefile(self, mode):
            if 'r' in mode:
                return io.BytesIO(body)
            elif 'w' in mode:
                return self.response_data

    mock_socket = MockSocket()
    handler_instance.connection = mock_socket
    handler_instance.rfile = io.BytesIO(body)
    handler_instance.wfile = mock_socket.response_data
    handler_instance.headers = headers

    # Handle the request
    if method == 'POST':
        handler_instance.do_POST()
    elif method == 'OPTIONS':
        handler_instance.do_OPTIONS()

    # Get response
    response_bytes = mock_socket.response_data.getvalue()

    # Extract headers and body from HTTP response
    response_str = response_bytes.decode('utf-8', errors='ignore')
    if '\r\n\r\n' in response_str:
        headers_part, body_part = response_str.split('\r\n\r\n', 1)
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': body_part
        }

    return {
        'statusCode': 500,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': 'Internal server error'})
    }